function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: "barowo-crm-gas",
      query: e && e.parameter ? e.parameter : {}
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const telegramRequest = isTelegramWebhookRequest_(e);
  const wantsJsonLeadResponse = isJsonLeadResponseRequested_(e);
  try {
    if (telegramRequest) {
      const payload = getTelegramWebhookPayload_(e);

      if (!isAuthorizedTelegramRelayPayload_(e, payload)) {
        appendLog_("warn", "telegram", "rejected relay payload", {
          update_id: payload && payload.update_id ? payload.update_id : null
        });

        return renderJson_(false, {
          error: "unauthorized_relay",
          update_id: payload && payload.update_id ? payload.update_id : null
        });
      }

      return handleTelegramWebhook_(payload);
    }

    return handleSiteLeadRequest_(e);
  } catch (error) {
    appendLog_("error", "doPost", error.message, {
      stack: error.stack || ""
    });

    if (telegramRequest) {
      return renderJson_(false, {
        error: error.message || "telegram_webhook_failed"
      });
    }

    if (wantsJsonLeadResponse) {
      return renderJson_(false, {
        error: error.message || "lead_submit_failed"
      });
    }

    return renderHtmlMessage_(
      "Wystąpił błąd podczas wysyłania formularza.",
      getBarowoConfig_().formSuccessUrl
    );
  }
}

function isJsonLeadResponseRequested_(e) {
  return !!(e && e.parameter && e.parameter.response === "json");
}

function renderJson_(ok, payload) {
  const body = payload || {};
  body.ok = ok;

  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function isTelegramWebhookRequest_(e) {
  if (e && e.parameter && e.parameter.telegram_payload) {
    return true;
  }

  if (!e || !e.postData || !e.postData.contents) {
    return false;
  }

  const contentType = e.postData.type || "";
  if (contentType.indexOf("application/json") !== 0) {
    return false;
  }

  try {
    const body = JSON.parse(e.postData.contents);
    return !!(body.message || body.callback_query);
  } catch (error) {
    return false;
  }
}

function getTelegramWebhookPayload_(e) {
  if (e && e.parameter && e.parameter.telegram_payload) {
    return JSON.parse(e.parameter.telegram_payload);
  }

  return JSON.parse((e && e.postData && e.postData.contents) || "{}");
}

function isAuthorizedTelegramRelayPayload_(e, payload) {
  const relayToken = (e && e.parameter && e.parameter.relay_token) ||
    (payload && payload.__relay_token) ||
    "";
  const expectedSecret = getBarowoConfig_().telegramRelaySecret;

  if (!expectedSecret) {
    if (!relayToken) {
      appendLog_("error", "telegram", "missing relay secret in Script Properties", null);
      return false;
    }

    PropertiesService.getScriptProperties().setProperty("TELEGRAM_RELAY_SHARED_SECRET", relayToken);
    appendLog_("info", "telegram", "bootstrapped relay secret from trusted relay", null);
    return true;
  }

  if (relayToken && relayToken !== expectedSecret) {
    appendLog_("warn", "telegram", "relay secret mismatch", {
      update_id: payload && payload.update_id ? payload.update_id : null
    });
    return false;
  }

  return relayToken === expectedSecret;
}

function handleSiteLeadRequest_(e) {
  const params = e && e.parameter ? e.parameter : {};
  const result = createLegacyWebsiteLead_(params);
  const successUrl = params.return_url || getBarowoConfig_().formSuccessUrl;
  const wantsJson = isJsonLeadResponseRequested_(e);

  if (!result.ok) {
    if (wantsJson) {
      return renderJson_(false, {
        error: "validation_failed",
        details: result.errors || []
      });
    }

    return renderHtmlMessage_(
      "Formularz jest niekompletny. Sprawdź wymagane pola i spróbuj ponownie.",
      successUrl
    );
  }

  if (wantsJson) {
    return renderJson_(true, {
      status: result.status || "created",
      uid: result.uid || "",
      redirect_url: successUrl
    });
  }

  return renderRedirect_(successUrl);
}

function renderRedirect_(url) {
  return HtmlService.createHtmlOutput(
    "<!doctype html>" +
      "<html lang=\"pl\"><head>" +
      "<meta charset=\"utf-8\">" +
      "<meta http-equiv=\"refresh\" content=\"0; url=" + escapeHtml_(url) + "\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<title>BAROWO</title>" +
      "</head><body>" +
      "<p>Przekierowanie...</p>" +
      "</body></html>"
  );
}

function renderHtmlMessage_(message, backUrl) {
  return HtmlService.createHtmlOutput(
    "<!doctype html>" +
      "<html lang=\"pl\"><head>" +
      "<meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<title>BAROWO</title>" +
      "<style>body{font-family:Arial,sans-serif;padding:24px;background:#06061a;color:#fff}a{color:#fff}</style>" +
      "</head><body>" +
      "<h1>BAROWO</h1>" +
      "<p>" + escapeHtml_(message) + "</p>" +
      "<p><a href=\"" + escapeHtml_(backUrl) + "\">Wróć do formularza</a></p>" +
      "</body></html>"
  );
}

function escapeHtml_(value) {
  return (value || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
