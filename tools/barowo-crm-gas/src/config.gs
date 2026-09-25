const BAROWO_DEFAULTS = Object.freeze({
  brandName: "BAROWO",
  leadsSheetName: "Leads",
  contactsSheetName: "Contacts",
  logsSheetName: "Logs",
  honeypotField: "company",
  defaultSuccessUrl: "https://barowo.com/#contact",
  defaultLeadRelayUrl: "https://barowo-telegram-relay.vanatarasuk20.workers.dev/lead",
  defaultManagerEmail: "barowo.pl@gmail.com",
  defaultManagerPhone: "+48 889 168 003",
  defaultCalendarName: "BAROWO",
  defaultDepositAmount: 1500,
  defaultExtraHourAmount: 600,
  defaultPenaltyAmount: 1500,
  defaultUmowaTemplateId: "1RSojjFA_0Wc8oAvccGaAW9Bz71L8P2EU_2MSlhlTUGg",
  defaultOfferPdfFileId: "16V4b2T6Ik2GlUunbaH4nRAm2I40RnkfW"
});

function getScriptProperty_(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}

function getRequiredScriptProperty_(name) {
  const value = getScriptProperty_(name);
  if (!value) {
    throw new Error("Missing Script Property: " + name);
  }
  return value;
}

function getNumberScriptProperty_(name, fallback) {
  const value = getScriptProperty_(name);
  if (value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

function getBooleanScriptProperty_(name, fallback) {
  const value = getScriptProperty_(name);
  if (value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toString().trim().toLowerCase());
}

function getBarowoConfig_() {
  return {
    brandName: getScriptProperty_("BAROWO_BRAND_NAME") || BAROWO_DEFAULTS.brandName,
    spreadsheetId: getRequiredScriptProperty_("BAROWO_SPREADSHEET_ID"),
    telegramBotToken: getScriptProperty_("TELEGRAM_BOT_TOKEN") || "",
    telegramGroupChatId: getScriptProperty_("TELEGRAM_GROUP_CHAT_ID") || "",
    telegramRelaySecret: getScriptProperty_("TELEGRAM_RELAY_SHARED_SECRET") || "",
    webAppUrl: getScriptProperty_("BAROWO_WEB_APP_URL") || "",
    leadPublicUrl: getScriptProperty_("BAROWO_PUBLIC_LEAD_FORM_URL") || BAROWO_DEFAULTS.defaultLeadRelayUrl,
    formSuccessUrl: getScriptProperty_("BAROWO_FORM_SUCCESS_URL") || BAROWO_DEFAULTS.defaultSuccessUrl,
    honeypotField: getScriptProperty_("BAROWO_FORM_HONEYPOT_FIELD") || BAROWO_DEFAULTS.honeypotField,
    enableModernSync: getBooleanScriptProperty_("BAROWO_ENABLE_MODERN_SYNC", false),
    managerEmail: getScriptProperty_("BAROWO_MANAGER_EMAIL") || BAROWO_DEFAULTS.defaultManagerEmail,
    managerPhone: getScriptProperty_("BAROWO_MANAGER_PHONE") || BAROWO_DEFAULTS.defaultManagerPhone,
    calendarName: getScriptProperty_("BAROWO_CALENDAR_NAME") || BAROWO_DEFAULTS.defaultCalendarName,
    depositAmount: getNumberScriptProperty_("BAROWO_DEPOSIT_AMOUNT", BAROWO_DEFAULTS.defaultDepositAmount),
    extraHourAmount: getNumberScriptProperty_("BAROWO_EXTRA_HOUR_AMOUNT", BAROWO_DEFAULTS.defaultExtraHourAmount),
    penaltyAmount: getNumberScriptProperty_("BAROWO_PENALTY_AMOUNT", BAROWO_DEFAULTS.defaultPenaltyAmount),
    umowaTemplateId: getScriptProperty_("BAROWO_UMOWA_TEMPLATE_ID") || BAROWO_DEFAULTS.defaultUmowaTemplateId,
    offerPdfFileId: getScriptProperty_("BAROWO_OFFER_PDF_FILE_ID") || BAROWO_DEFAULTS.defaultOfferPdfFileId
  };
}
