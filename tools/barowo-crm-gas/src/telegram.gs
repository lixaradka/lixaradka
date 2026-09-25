function sendTelegramApiRequest_(method, payload) {
  const config = getBarowoConfig_();

  if (!config.telegramBotToken) {
    appendLog_("warn", "telegram", "missing TELEGRAM_BOT_TOKEN", null);
    return null;
  }

  const response = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + config.telegramBotToken + "/" + method,
    {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify(payload)
    }
  );

  return JSON.parse(response.getContentText());
}

function sendTelegramLeadNotification_(lead) {
  const config = getBarowoConfig_();

  if (!config.telegramGroupChatId) {
    appendLog_("warn", "telegram", "missing TELEGRAM_GROUP_CHAT_ID", null);
    return;
  }

  sendTelegramApiRequest_("sendMessage", {
    chat_id: config.telegramGroupChatId,
    text: buildTelegramLeadMessage_(lead),
    parse_mode: "HTML"
  });
}

function getTelegramWebhookUrl_(overrideUrl) {
  const config = getBarowoConfig_();
  const url = (overrideUrl || config.webAppUrl || "").trim();

  if (!url) {
    throw new Error("Missing webhook URL. Set BAROWO_WEB_APP_URL in Script Properties.");
  }

  return url;
}

function handleTelegramWebhook_(payload) {
  if (isDuplicateTelegramUpdate_(payload)) {
    appendLog_("info", "telegram", "duplicate update skipped", {
      update_id: payload && payload.update_id ? payload.update_id : null
    });
    return renderJson_(true, { duplicate: true });
  }

  if (isDuplicateTelegramAction_(payload)) {
    appendLog_("info", "telegram", "duplicate callback action skipped", {
      update_id: payload && payload.update_id ? payload.update_id : null
    });
    return renderJson_(true, { duplicate_action: true });
  }

  try {
    if (payload.message && typeof handleMessage === "function") {
      handleMessage(payload.message);
    }

    if (payload.callback_query && typeof handleCallback === "function") {
      handleCallback(payload.callback_query);
    }
  } catch (error) {
    if (isCrmBusyError_(error)) {
      notifyBusyTelegramClient_(payload);
      appendLog_("warn", "telegram", "crm busy", {
        update_id: payload && payload.update_id ? payload.update_id : null
      });
      return renderJson_(false, {
        error: "crm_busy",
        update_id: payload && payload.update_id ? payload.update_id : null
      });
    }

    appendLog_("error", "telegram", "webhook handler failed", {
      update_id: payload && payload.update_id ? payload.update_id : null,
      message: error.message || String(error),
      stack: error.stack || ""
    });
    return renderJson_(false, {
      error: error.message || "telegram_handler_failed",
      update_id: payload && payload.update_id ? payload.update_id : null
    });
  }

  markTelegramUpdateProcessed_(payload);
  markTelegramActionProcessed_(payload);

  return renderJson_(true, {});
}

function isCrmBusyError_(error) {
  return !!(error && (error.code === "CRM_BUSY" || error.message === "crm_busy"));
}

function notifyBusyTelegramClient_(payload) {
  const callback = payload && payload.callback_query;
  const message = payload && payload.message;

  if (callback && callback.id) {
    sendTelegramApiRequest_("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "CRM jest teraz zajęta. Spróbuj ponownie za kilka sekund."
    });
    return;
  }

  const chatId = message && message.chat ? message.chat.id : null;
  if (chatId) {
    sendTemp(chatId, "⏳ CRM jest teraz zajęta. Spróbuj ponownie za kilka sekund.");
  }
}

function getTelegramUpdateCacheKey_(payload) {
  const updateId = payload && payload.update_id;
  return updateId || updateId === 0 ? "telegram_update_" + updateId : "";
}

function isDuplicateTelegramUpdate_(payload) {
  const key = getTelegramUpdateCacheKey_(payload);
  if (!key) {
    return false;
  }

  const cache = CacheService.getScriptCache();
  return cache.get(key) === "1";
}

function markTelegramUpdateProcessed_(payload) {
  const key = getTelegramUpdateCacheKey_(payload);
  if (!key) {
    return;
  }

  CacheService.getScriptCache().put(key, "1", 600);
}

function getTelegramActionCacheKey_(payload) {
  if (!payload || !payload.callback_query || !payload.callback_query.message) {
    return "";
  }

  const callbackQuery = payload.callback_query;
  const fromId = callbackQuery.from && callbackQuery.from.id ? callbackQuery.from.id : "";
  const chatId = callbackQuery.message.chat && callbackQuery.message.chat.id ? callbackQuery.message.chat.id : "";
  const messageId = callbackQuery.message.message_id || "";
  const data = callbackQuery.data || "";

  if (!fromId || !chatId || !messageId || !data) {
    return "";
  }

  return "telegram_action_" + fromId + "_" + chatId + "_" + messageId + "_" + Utilities.base64EncodeWebSafe(data);
}

function isDuplicateTelegramAction_(payload) {
  const key = getTelegramActionCacheKey_(payload);
  if (!key) {
    return false;
  }

  return CacheService.getScriptCache().get(key) === "1";
}

function markTelegramActionProcessed_(payload) {
  const key = getTelegramActionCacheKey_(payload);
  if (!key) {
    return;
  }

  CacheService.getScriptCache().put(key, "1", 15);
}

function setTelegramWebhook(webAppUrl) {
  const url = getTelegramWebhookUrl_(webAppUrl);
  const result = sendTelegramApiRequest_("setWebhook", {
    url: url
  });

  appendLog_("info", "telegram", "webhook updated", {
    url: url,
    result: result
  });

  if (!result || !result.ok) {
    throw new Error("Telegram webhook setup failed");
  }

  return result;
}

function deleteTelegramWebhook(dropPendingUpdates) {
  const result = sendTelegramApiRequest_("deleteWebhook", {
    drop_pending_updates: dropPendingUpdates !== false
  });

  appendLog_("info", "telegram", "webhook deleted", {
    result: result
  });

  if (!result || !result.ok) {
    throw new Error("Telegram webhook delete failed");
  }

  return result;
}

function getTelegramUpdatesOffset_() {
  const raw = PropertiesService.getScriptProperties().getProperty("TELEGRAM_LAST_UPDATE_ID");
  const parsed = parseInt(raw || "0", 10);
  return isNaN(parsed) ? 0 : parsed;
}

function setTelegramUpdatesOffset_(updateId) {
  PropertiesService.getScriptProperties().setProperty("TELEGRAM_LAST_UPDATE_ID", String(updateId));
}

function pollTelegramUpdates() {
  const token = getBarowoConfig_().telegramBotToken;
  if (!token) {
    appendLog_("warn", "telegram", "poll skipped: missing token", null);
    return { ok: false, reason: "missing_token" };
  }

  const webhookInfo = sendTelegramApiRequest_("getWebhookInfo", {});
  if (webhookInfo && webhookInfo.ok && webhookInfo.result && webhookInfo.result.url) {
    return { ok: true, skipped: "webhook_active" };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    appendLog_("info", "telegram", "poll skipped: lock busy", null);
    return { ok: false, reason: "lock_busy" };
  }

  try {
    const currentOffset = getTelegramUpdatesOffset_();
    const result = sendTelegramApiRequest_("getUpdates", {
      offset: currentOffset + 1,
      limit: 100,
      timeout: 0,
      allowed_updates: ["message", "callback_query"]
    });

    if (!result || !result.ok) {
      appendLog_("error", "telegram", "getUpdates failed", {
        result: result
      });
      return { ok: false, reason: "get_updates_failed" };
    }

    const updates = result.result || [];
    let maxUpdateId = currentOffset;

    updates.forEach(function (update) {
      handleTelegramWebhook_(update);
      if (typeof update.update_id === "number" && update.update_id > maxUpdateId) {
        maxUpdateId = update.update_id;
      }
    });

    if (maxUpdateId > currentOffset) {
      setTelegramUpdatesOffset_(maxUpdateId);
    }

    return {
      ok: true,
      processed: updates.length,
      offset: maxUpdateId
    };
  } finally {
    lock.releaseLock();
  }
}
