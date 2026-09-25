const LEGACY_CRM_SHEET_SCHEMAS = Object.freeze({
  lidy: {
    name: CONFIG.SHEET_LIDY,
    headers: [
      "id",
      "created_time",
      "ad_id",
      "ad_name",
      "adset_id",
      "adset_name",
      "campaign_id",
      "campaign_name",
      "form_id",
      "form_name",
      "is_organic",
      "platform",
      "Rodzaj",
      "Ilosc_osob",
      "Data",
      "Miasto",
      "Imie",
      "Email",
      "Telefon",
      "lead_source",
      "lead_status",
      "telegram_status",
      "Przypisano",
      "Oferta",
      "Umowa",
      "Spam",
      "unused_27",
      "REMIND",
      "Notatka",
      "Historia",
      "NEXTCALL",
      "CAL_ID",
      "Guests",
      "Package",
      "Hours"
    ]
  },
  spam: {
    name: CONFIG.SHEET_SPAM,
    headers: [
      "id",
      "created_time",
      "ad_id",
      "ad_name",
      "adset_id",
      "adset_name",
      "campaign_id",
      "campaign_name",
      "form_id",
      "form_name",
      "is_organic",
      "platform",
      "Rodzaj",
      "Ilosc_osob",
      "Data",
      "Miasto",
      "Imie",
      "Email",
      "Telefon",
      "lead_source",
      "lead_status",
      "telegram_status",
      "Przypisano",
      "Oferta",
      "Umowa",
      "Spam",
      "unused_27",
      "REMIND",
      "Notatka",
      "Historia",
      "NEXTCALL",
      "CAL_ID",
      "Guests",
      "Package",
      "Hours"
    ]
  },
  kontakty: {
    name: CONFIG.SHEET_CONTACTS,
    headers: [
      "Imie",
      "Telefon",
      "Email",
      "Miasto",
      "Data",
      "Rodzaj",
      "Dodano",
      "Status"
    ]
  },
  finanse: {
    name: CONFIG.SHEET_FINANCE,
    headers: [
      "Data",
      "Klient",
      "Event",
      "Package",
      "Revenue",
      "Costs_Alcohol",
      "Costs_Transport",
      "Costs_Staff",
      "Costs_Other",
      "Tips",
      "Net",
      "Assigned"
    ]
  },
  log: {
    name: CONFIG.SHEET_LOG,
    headers: [
      "created_at",
      "who",
      "action",
      "lead_name",
      "details"
    ]
  }
});

function ensureLegacyCrmSheet_(schema) {
  const spreadsheet = getBarowoSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(schema.name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(schema.name);
  }

  ensureSheetHeaders_(sheet, schema.headers);
  return sheet;
}

function bootstrapLegacyCrmSheets_() {
  Object.keys(LEGACY_CRM_SHEET_SCHEMAS).forEach(function (key) {
    ensureLegacyCrmSheet_(LEGACY_CRM_SHEET_SCHEMAS[key]);
  });
}

function assertLegacyCrmSheets_() {
  const requiredSheets = Object.keys(LEGACY_CRM_SHEET_SCHEMAS).map(function (key) {
    return LEGACY_CRM_SHEET_SCHEMAS[key].name;
  });

  const spreadsheet = getBarowoSpreadsheet_();
  const missing = requiredSheets.filter(function (sheetName) {
    return !spreadsheet.getSheetByName(sheetName);
  });

  if (missing.length > 0) {
    throw new Error("Missing legacy CRM sheets: " + missing.join(", "));
  }
}

function ensureTelegramRelaySecret_() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty("TELEGRAM_RELAY_SHARED_SECRET");
  if (existing) {
    return existing;
  }

  const generated = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  props.setProperty("TELEGRAM_RELAY_SHARED_SECRET", generated);
  return generated;
}

function setTelegramRelaySharedSecret(secret) {
  const value = (secret || "").toString().trim();
  if (value.length < 24) {
    throw new Error("Relay secret must be at least 24 characters long.");
  }

  PropertiesService.getScriptProperties().setProperty("TELEGRAM_RELAY_SHARED_SECRET", value);
  return { ok: true };
}

function debugTelegramRuntime() {
  const privateChatId = 1306697008;
  const results = {
    ok: true,
    tokenConfigured: !!getToken()
  };

  try {
    const webhookInfo = sendTelegramApiRequest_("getWebhookInfo", {});
    results.webhookInfo = webhookInfo && webhookInfo.ok ? webhookInfo.result : webhookInfo;
  } catch (error) {
    results.webhookInfoError = error.message;
  }

  try {
    results.dmMessageId = sendDM(privateChatId, "🧪 BAROWO CRM debug: Apps Script DM path works.");
  } catch (error) {
    results.dmError = error.message;
  }

  try {
    results.groupMessageId = send(CONFIG.GROUP_CHAT_ID, "🧪 BAROWO CRM debug: Apps Script group path works.");
  } catch (error) {
    results.groupError = error.message;
  }

  try {
    handleMessage({
      text: "/ping",
      message_id: 999991,
      chat: { id: privateChatId, type: "private" },
      from: { id: privateChatId, is_bot: false, first_name: "Ivan" }
    });
    results.handleMessagePing = "ok";
  } catch (error) {
    results.handleMessagePing = "error";
    results.handleMessageError = error.message;
    results.handleMessageStack = error.stack || "";
  }

  return results;
}

function finalizeBarowoCrmSetup() {
  bootstrapBarowoCRM();
  bootstrapLegacyCrmSheets_();
  assertLegacyCrmSheets_();
  const relaySecret = ensureTelegramRelaySecret_();
  setupTriggers();

  appendLog_("info", "setup", "BAROWO CRM setup finalized", {
    spreadsheetId: getBarowoConfig_().spreadsheetId,
    relaySecretConfigured: !!relaySecret
  });

  return {
    ok: true,
    mode: "telegram_external_relay",
    relaySecretConfigured: !!relaySecret
  };
}
