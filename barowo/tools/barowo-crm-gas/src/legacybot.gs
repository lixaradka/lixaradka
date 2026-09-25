// ─── BAROWO CRM Bot v18 ──────────────────────────────────────────────────────
// Changelog v18:
// - CONFIG объект: все настройки в одном месте
// - Уникальные ID лидов (uid) вместо номеров строк — кнопки не ломаются при удалении
// - Исправлен парсинг дат Facebook (апостроф + DD.MM формат)
// - Убраны debug-сообщения
// - Генерация умовы: одно сообщение вместо 7
// - Разные TTL для разных типов сообщений
// - Уведомления при назначении лида
// - Удаление из календаря при удалении лида (с логированием)
// - Проверка существования события в календаре
// - Количество гостей в карточке лида
// - Время в "следующий контакт"
// - Дата залога: если < today → today+1
// - Динамическая подпись email (whoIsUser + CONFIG.BRAND)
// - Роли: ADMIN вместо хардкода "Ivan"
// - Утренний брифинг: завтрашние события
// - Убрана кнопка "Zmień datę"
// - Убрана /szukaj из группы
// - Логирование действий (лист Log)
// - Обработка ошибок Telegram API
// - LockService на все операции записи
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// ██  CONFIG — ЕДИНСТВЕННОЕ МЕСТО ДЛЯ НАСТРОЙКИ ПОД КЛИЕНТА
// ═══════════════════════════════════════════════════════════════════════════════

const BAROWO_TELEGRAM_GROUP_CHAT_ID = getBarowoConfig_().telegramGroupChatId || "-1003789163562";

const CONFIG = {
  // ─── Бренд ───
  BRAND: getBarowoConfig_().brandName,

  // ─── Telegram ───
  GROUP_CHAT_ID: BAROWO_TELEGRAM_GROUP_CHAT_ID,
  ALLOWED_USERS: [BAROWO_TELEGRAM_GROUP_CHAT_ID, "1306697008", "5420432566"],

  // ─── Команда (id → имя, роль) ───
  TEAM: {
    "1306697008": { name: "Ivan",  role: "admin" },
    "5420432566": { name: "Artem", role: "member" }
  },

  // ─── Google ───
  CALENDAR_NAME: getBarowoConfig_().calendarName,
  UMOWA_TEMPLATE_ID: getBarowoConfig_().umowaTemplateId,
  PDF_FILE_ID: getBarowoConfig_().offerPdfFileId,

  // ─── Листы ───
  SHEET_LIDY: "Lidy",
  SHEET_SPAM: "Spam",
  SHEET_CONTACTS: "Kontakty", 
  SHEET_FINANCE: "Finanse",
  SHEET_LOG: "Log",

  // ─── Пакеты ───
  PACKAGES: {
    simple:   { name: "Simple",   barmen: 1, slush: false, prices: { 50: 2650, 100: 4090 } },
    standard: { name: "Standard", barmen: 2, slush: false, prices: { 50: 4050, 100: 6500 } },
    premium:  { name: "Premium",  barmen: 2, slush: true,  prices: { 50: 7050, 100: 10000 } }
  },

  // ─── Фиксированные суммы ───
  DEPOSIT: getBarowoConfig_().depositAmount,
  EXTRA_HOUR: getBarowoConfig_().extraHourAmount,
  PENALTY: getBarowoConfig_().penaltyAmount,

  // ─── TTL сообщений (мс) ───
  TTL_CONFIRM: 5 * 60 * 1000,    // 5 мин — подтверждения, ошибки
  TTL_LIST: 15 * 60 * 1000,      // 15 мин — списки, статистика
  TTL_DEFAULT: 10 * 60 * 1000,   // 10 мин — остальное

  // ─── State TTL ───
  STATE_TTL_MS: 10 * 60 * 1000
};

// ─── Колонки ─────────────────────────────────────────────────────────────────

const COL = {
  UID: 1,
  CREATED_AT: 2,
  LEAD_SOURCE: 20,
  LEAD_STATUS: 21,
  TELEGRAM_STATUS: 22,
  EVENT: 13, DATE: 15, CITY: 16, NAME: 17, EMAIL: 18, PHONE: 19,
  SENT: 22, ASSIGNED: 23, OFERTA: 24, UMOWA: 25, SPAM: 26,
  REMIND: 28, NOTE: 29, CALLHIST: 30, NEXTCALL: 31,
  CAL_ID: 32, GUESTS: 33, PACKAGE: 34, HOURS: 35,
  CLIENT_FULL_NAME: 36, CLIENT_ADDRESS: 37
};

const KCOL = { NAME: 1, PHONE: 2, EMAIL: 3, CITY: 4, DATE: 5, EVENT: 6, ADDED: 7, STATUS: 8 };

const FCOL = {
  DATE: 1, NAME: 2, EVENT: 3, PACKAGE: 4, REVENUE: 5,
  COSTS_ALCOHOL: 6, COSTS_TRANSPORT: 7, COSTS_STAFF: 8, COSTS_OTHER: 9,
  TIPS: 10, NET: 11, ASSIGNED: 12
};

// ─── Secrets ─────────────────────────────────────────────────────────────────

function setSecrets() {
  const token = getBarowoConfig_().telegramBotToken;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN in Script Properties.");
  }
  PropertiesService.getScriptProperties().setProperties({
    "BOT_TOKEN": token
  });
  Logger.log("✅ Secrets saved.");
}

function getToken() {
  const t = PropertiesService.getScriptProperties().getProperty("BOT_TOKEN") ||
    getBarowoConfig_().telegramBotToken;
  if (!t) throw new Error("BOT_TOKEN not set. Add TELEGRAM_BOT_TOKEN in Script Properties.");
  return t;
}

// ─── Team helpers ────────────────────────────────────────────────────────────

function whoIsUser(chatId) {
  const member = CONFIG.TEAM[chatId.toString()];
  return member ? member.name : null;
}

function getUserRole(chatId) {
  const member = CONFIG.TEAM[chatId.toString()];
  return member ? member.role : null;
}

function isAdmin(chatId) {
  return getUserRole(chatId) === "admin";
}

function getTeamIdByName(name) {
  for (const [id, m] of Object.entries(CONFIG.TEAM)) {
    if (m.name === name) return id;
  }
  return null;
}

function isDM(chatId) {
  return chatId.toString() !== CONFIG.GROUP_CHAT_ID && !chatId.toString().startsWith("-");
}

function isAllowed(chat) {
  return CONFIG.ALLOWED_USERS.includes(chat.toString());
}

function findDuplicateLegacyLeadRow_(sh, name, phone, email) {
  if (!sh) return -1;

  const targetPhone = normalizeComparablePhone_(phone);
  const targetEmail = normalizeComparableEmail_(email);
  const targetName = (name || "").toString().trim().toLowerCase();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return -1;

  const rows = sh.getRange(2, COL.NAME, lastRow - 1, 3).getValues();

  for (let i = 0; i < rows.length; i++) {
    const rowName = (rows[i][0] || "").toString().trim().toLowerCase();
    const rowEmail = (rows[i][1] || "").toString().trim().toLowerCase();
    const rowPhone = normalizeComparablePhone_(rows[i][2]);

    if (targetPhone && rowPhone && targetPhone === rowPhone) return i + 2;
    if (targetEmail && rowEmail && targetEmail === rowEmail) return i + 2;
    if (targetName && rowName === targetName && targetPhone && rowPhone && targetPhone === rowPhone) return i + 2;
  }

  return -1;
}

function buildManualLegacyLeadRow_(fields, source, assignedName) {
  const row = new Array(COL.CLIENT_ADDRESS).fill("");
  row[COL.UID - 1] = generateUID();
  row[COL.CREATED_AT - 1] = new Date().toISOString();
  row[COL.EVENT - 1] = fields.event || "";
  row[COL.DATE - 1] = fields.date || "";
  row[COL.CITY - 1] = fields.city || "";
  row[COL.NAME - 1] = fields.name || "";
  row[COL.EMAIL - 1] = fields.email || "";
  row[COL.PHONE - 1] = fields.phone ? "'" + fields.phone : "";
  row[COL.LEAD_SOURCE - 1] = source || "manual";
  row[COL.LEAD_STATUS - 1] = assignedName ? LEGACY_LEAD_STAGE.ASSIGNED : LEGACY_LEAD_STAGE.NEW;
  row[COL.ASSIGNED - 1] = assignedName || "";
  row[COL.CLIENT_FULL_NAME - 1] = fields.name || "";
  return row;
}

function getLeadContractClientName_(lead) {
  return (lead[COL.CLIENT_FULL_NAME - 1] || lead[COL.NAME - 1] || "").toString().trim();
}

function getLeadContractClientAddress_(lead) {
  return (lead[COL.CLIENT_ADDRESS - 1] || "").toString().trim();
}

// ─── UID: уникальный ID лида ─────────────────────────────────────────────────

function generateUID() {
  return Utilities.getUuid().replace(/-/g, "").substring(0, 8);
}

function getLeadRowCacheKey_(sheetName, uid) {
  return "legacy_lead_row_" + sheetName + "_" + uid;
}

function cacheLeadRowNumber_(sh, uid, rowNumber) {
  if (!sh || !uid || !rowNumber || rowNumber < 2) {
    return;
  }

  CacheService.getScriptCache().put(getLeadRowCacheKey_(sh.getName(), uid), String(rowNumber), 21600);
}

function findRowByUID(sh, uid) {
  if (!uid) return -1;
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return -1;

  const cacheKey = getLeadRowCacheKey_(sh.getName(), uid);
  const cachedValue = CacheService.getScriptCache().get(cacheKey);
  const cachedRow = parseInt(cachedValue || "", 10);

  if (!isNaN(cachedRow) && cachedRow >= 2 && cachedRow <= lastRow) {
    const cachedUid = (sh.getRange(cachedRow, COL.UID).getValue() || "").toString();
    if (cachedUid === uid) {
      return cachedRow;
    }
  }

  const uidColumn = sh.getRange(2, COL.UID, lastRow - 1, 1).getValues();
  for (let i = 0; i < uidColumn.length; i++) {
    if ((uidColumn[i][0] || "").toString() === uid) {
      const rowNumber = i + 2;
      cacheLeadRowNumber_(sh, uid, rowNumber);
      return rowNumber;
    }
  }
  return -1;
}

function getLeadRowDataByUid_(sh, uid) {
  const rowNumber = findRowByUID(sh, uid);
  if (rowNumber < 0) {
    return null;
  }

  return {
    rowNumber: rowNumber,
    rowData: sh.getRange(rowNumber, 1, 1, sh.getLastColumn()).getValues()[0]
  };
}

function buildBusyError_() {
  const error = new Error("crm_busy");
  error.code = "CRM_BUSY";
  return error;
}

// ─── Async delete queue ──────────────────────────────────────────────────────

function scheduleDelete(chat, msgId, ttlMs) {
  if (!msgId) return;
  const when = new Date().getTime() + (ttlMs || CONFIG.TTL_DEFAULT);
  PropertiesService.getScriptProperties()
    .setProperty("del|" + chat + "|" + msgId, when.toString());
}

function cleanupMessages() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const now = new Date().getTime();
  const token = props["BOT_TOKEN"] || getBarowoConfig_().telegramBotToken;
  if (!token) return;
  Object.keys(props).forEach(key => {
    if (!key.startsWith("del|")) return;
    const when = parseInt(props[key]);
    if (now < when) return;
    const p = key.split("|");
    if (p.length < 3) { PropertiesService.getScriptProperties().deleteProperty(key); return; }
    try {
      UrlFetchApp.fetch(
        "https://api.telegram.org/bot" + token + "/deleteMessage",
        {
          method: "post", contentType: "application/json",
          payload: JSON.stringify({ chat_id: p[1], message_id: parseInt(p[2]) })
        }
      );
    } catch (e) { Logger.log("cleanup err: " + e); }
    PropertiesService.getScriptProperties().deleteProperty(key);
  });
}

// ─── State ───────────────────────────────────────────────────────────────────

function getState(chat) {
  const raw = PropertiesService.getScriptProperties().getProperty("state_" + chat);
  if (!raw) return null;
  const st = JSON.parse(raw);
  if (new Date().getTime() - st.ts > CONFIG.STATE_TTL_MS) { clearState(chat); return null; }
  return st;
}

function setState(chat, obj) {
  obj.ts = new Date().getTime();
  PropertiesService.getScriptProperties().setProperty("state_" + chat, JSON.stringify(obj));
}

function clearState(chat) {
  PropertiesService.getScriptProperties().deleteProperty("state_" + chat);
}

// ─── Sheets ──────────────────────────────────────────────────────────────────

function getLegacyCrmSpreadsheet_() {
  return getBarowoSpreadsheet_();
}

function sheetLidy() { return getCachedSheetByName_(CONFIG.SHEET_LIDY); }
function sheetSpam() { return getCachedSheetByName_(CONFIG.SHEET_SPAM); }
function sheetKontakty() { return getCachedSheetByName_(CONFIG.SHEET_CONTACTS); }

function sheetFinanse() {
  const spreadsheet = getLegacyCrmSpreadsheet_();
  let sh = getCachedSheetByName_(CONFIG.SHEET_FINANCE);
  if (!sh) {
    sh = spreadsheet.insertSheet(CONFIG.SHEET_FINANCE);
    setCachedSheetByName_(CONFIG.SHEET_FINANCE, sh);
    sh.appendRow(["Data", "Imię", "Wydarzenie", "Pakiet", "Przychód",
      "Alkohol", "Transport", "Barman", "Inne", "Napiwki", "Zysk netto", "Kto"]);
  }
  return sh;
}

function sheetLog() {
  const spreadsheet = getLegacyCrmSpreadsheet_();
  let sh = getCachedSheetByName_(CONFIG.SHEET_LOG);
  if (!sh) {
    sh = spreadsheet.insertSheet(CONFIG.SHEET_LOG);
    setCachedSheetByName_(CONFIG.SHEET_LOG, sh);
    sh.appendRow(["Data", "Kto", "Akcja", "Lead", "Szczegóły"]);
  }
  return sh;
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function logAction(who, action, leadName, details) {
  try {
    sheetLog().appendRow([
      new Date().toISOString(),
      who || "Bot",
      action,
      leadName || "",
      details || ""
    ]);
  } catch (e) { Logger.log("logAction err: " + e); }
}

// ─── Telegram API (с проверкой ошибок) ───────────────────────────────────────

function apiCall(method, payload) {
  try {
    const resp = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + getToken() + "/" + method,
      { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true }
    );
    const result = JSON.parse(resp.getContentText());
    if (!result.ok) {
      Logger.log("API error " + method + ": " + result.description);
      return null;
    }
    return result;
  } catch (e) { Logger.log(method + " error: " + e); return null; }
}

function send(chat, text, kb) {
  const p = { chat_id: chat, text: text, parse_mode: "HTML" };
  if (kb) p.reply_markup = JSON.stringify(kb);
  const r = apiCall("sendMessage", p);
  return r && r.result ? r.result.message_id : null;
}

function sendTemp(chat, text, kb, ttl) {
  const id = send(chat, text, kb);
  if (id) scheduleDelete(chat, id, ttl || CONFIG.TTL_CONFIRM);
  return id;
}

function edit(chat, id, text, kb) {
  const p = { chat_id: chat, message_id: id, text: text, parse_mode: "HTML" };
  if (kb) p.reply_markup = JSON.stringify(kb);
  apiCall("editMessageText", p);
}

function deleteMsg(chat, id) {
  if (!id) return;
  const r = apiCall("deleteMessage", { chat_id: chat, message_id: id });
  if (!r) Logger.log("deleteMsg failed: chat=" + chat + " msg=" + id);
}

function pinMsg(chat, id) {
  apiCall("pinChatMessage", { chat_id: chat, message_id: id, disable_notification: true });
}

function unpinAll(chat) { apiCall("unpinAllChatMessages", { chat_id: chat }); }

function answer(id, text) {
  const p = { callback_query_id: id };
  if (text) p.text = text;
  apiCall("answerCallbackQuery", p);
}

function dmKeyboard() {
  return {
    keyboard: [
      [{ text: "📋 Moje leady" }, { text: "📌 Zadania" }],
      [{ text: "✏️ Nowe zadanie" }, { text: "💰 Rozliczenie" }],
      [{ text: "📅 Kalendarz" }, { text: "➕ Nowy lead" }]
    ], resize_keyboard: true, is_persistent: true
  };
}

function sendDM(chat, text, kb) {
  const p = { chat_id: chat, text: text, parse_mode: "HTML" };
  if (kb) p.reply_markup = JSON.stringify(kb);
  else p.reply_markup = JSON.stringify(dmKeyboard());
  const r = apiCall("sendMessage", p);
  return r && r.result ? r.result.message_id : null;
}

function sendDocument(chat, blob, caption) {
  try {
    const contentType = blob.getContentType() || "application/octet-stream";
    const boundary = "----FormBoundary" + Utilities.getUuid();
    const pre = "--" + boundary + "\r\n" +
      'Content-Disposition: form-data; name="chat_id"\r\n\r\n' + chat + "\r\n" +
      "--" + boundary + "\r\n" +
      'Content-Disposition: form-data; name="caption"\r\n\r\n' + (caption || "") + "\r\n" +
      "--" + boundary + "\r\n" +
      'Content-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n' +
      "--" + boundary + "\r\n" +
      'Content-Disposition: form-data; name="document"; filename="' + blob.getName() + '"\r\n' +
      "Content-Type: " + contentType + "\r\n\r\n";
    const post = "\r\n--" + boundary + "--\r\n";
    const payload = Utilities.newBlob(pre).getBytes()
      .concat(blob.getBytes())
      .concat(Utilities.newBlob(post).getBytes());
    const resp = UrlFetchApp.fetch("https://api.telegram.org/bot" + getToken() + "/sendDocument", {
      method: "post",
      contentType: "multipart/form-data; boundary=" + boundary,
      payload: payload
    });
    return JSON.parse(resp.getContentText());
  } catch (e) {
    notifyError("sendDocument", e);
    return null;
  }
}

function notifyError(ctx, err) {
  try {
    const t = PropertiesService.getScriptProperties().getProperty("BOT_TOKEN") ||
      getBarowoConfig_().telegramBotToken;
    if (!t) return;
    UrlFetchApp.fetch("https://api.telegram.org/bot" + t + "/sendMessage",
      {
        method: "post", contentType: "application/json",
        payload: JSON.stringify({
          chat_id: CONFIG.GROUP_CHAT_ID,
          text: "⚠️ <b>Błąd</b>\n<b>Funkcja:</b> " + ctx + "\n<b>Błąd:</b> " + err,
          parse_mode: "HTML"
        })
      });
  } catch (e) { }
}

// ─── Dates (ИСПРАВЛЕН парсинг Facebook дат) ──────────────────────────────────

function formatDate(value) {
  if (!value) return "";
  const d = parseDate(value);
  if (isNaN(d.getTime())) return value.toString();
  return String(d.getDate()).padStart(2, "0") + "." +
    String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
}

function parseDate(value) {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;
  // Убираем апостроф от Facebook: '19.10.2027 → 19.10.2027
  let str = value.toString().trim().replace(/^'+/, "");
  // Пробуем DD.MM.YYYY формат СНАЧАЛА (приоритет над JS Date)
  const dotParts = str.split(".");
  if (dotParts.length >= 2) {
    const day = parseInt(dotParts[0]);
    const month = parseInt(dotParts[1]) - 1;
    const year = dotParts.length >= 3
      ? (dotParts[2].length == 2 ? 2000 + parseInt(dotParts[2]) : parseInt(dotParts[2]))
      : new Date().getFullYear();
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return new Date(year, month, day);
    }
  }
  // Fallback на стандартный парсинг
  let d = new Date(str);
  return d;
}

function parseHoursRange_(value, baseDate) {
  const text = (value || "").toString().trim();
  const match = text.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match || !baseDate || isNaN(baseDate.getTime())) {
    return null;
  }

  const start = new Date(baseDate.getTime());
  const end = new Date(baseDate.getTime());
  start.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  end.setHours(parseInt(match[3], 10), parseInt(match[4], 10), 0, 0);

  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return { start: start, end: end };
}

// ─── Keyboards (используют UID вместо номеров строк) ─────────────────────────

function keyboard(uid, calAdded) {
  const calBtn = calAdded
    ? { text: "✅ W kalendarzu", callback_data: "calcheck_" + uid }
    : { text: "📅 → Kalendarz", callback_data: "cal_" + uid };
  const assignButtons = Object.values(CONFIG.TEAM).map(function (member) {
    return {
      text: "👤 " + member.name,
      callback_data: "assign_" + slugifyTeamName_(member.name) + "_" + uid
    };
  });
  return {
    inline_keyboard: [
      assignButtons,
      [{ text: "📧 Oferta+Szkic", callback_data: "draft_" + uid },
       { text: "📝 Umowa", callback_data: "umowa_" + uid }],
      [{ text: "🔔 Nast. kontakt", callback_data: "nextcall_" + uid },
       { text: "🗒 Notatka", callback_data: "note_" + uid }],
      [{ text: "📄 Gen. umowę", callback_data: "genumowa_" + uid },
       calBtn],
      [{ text: "🗑 Spam", callback_data: "spam_" + uid }],
      [{ text: "❌ Usuń lead", callback_data: "delete_" + uid }]
    ]
  };
}

function leadKeyboard_(uid, row) {
  return keyboard(uid, isInCalendar(row));
}

function confirmKeyboard(action, uid) {
  return {
    inline_keyboard: [[
      { text: "✅ Potwierdź", callback_data: "confirm_" + action + "_" + uid },
      { text: "◀️ Wróć", callback_data: "back_" + uid }
    ]]
  };
}

function packageKeyboard(uid) {
  return {
    inline_keyboard: [
      [{ text: "🥉 Simple", callback_data: "pkg_simple_" + uid },
       { text: "🥈 Standard", callback_data: "pkg_standard_" + uid },
       { text: "🥇 Premium", callback_data: "pkg_premium_" + uid }],
      [{ text: "◀️ Wróć", callback_data: "back_" + uid }]
    ]
  };
}

function genPkgKb(uid) {
  return {
    inline_keyboard: [
      [{ text: "🥉 Simple", callback_data: "gu_simple_" + uid },
       { text: "🥈 Standard", callback_data: "gu_std_" + uid },
       { text: "🥇 Premium", callback_data: "gu_prem_" + uid }],
      [{ text: "◀️ Wróć", callback_data: "back_" + uid }]
    ]
  };
}

function nocallListKeyboard(leads) {
  return { inline_keyboard: leads.map(l => [{ text: "👤 " + l.name, callback_data: "opencall_" + l.uid }]) };
}

function leadsMenuKeyboard() {
  const teamButtons = Object.values(CONFIG.TEAM).map(function (member) {
    return { text: "👤 " + member.name, callback_data: "leads_team_" + slugifyTeamName_(member.name) };
  });
  const teamRows = [];
  for (let index = 0; index < teamButtons.length; index += 2) {
    teamRows.push(teamButtons.slice(index, index + 2));
  }

  return {
    inline_keyboard: [
      [{ text: "📋 Wszystkie", callback_data: "leads_all" },
       { text: "🔥 Bez oferty", callback_data: "leads_hot" }],
      [{ text: "📵 Bez przypisania", callback_data: "leads_nocall" },
       { text: "📅 Dzisiaj", callback_data: "leads_today" }]
    ].concat(teamRows)
  };
}

function spamListKeyboard(leads) {
  return { inline_keyboard: leads.map(l => [{ text: "↩️ " + l.name, callback_data: "restore_" + l.uid }]) };
}

// ─── Lead card ───────────────────────────────────────────────────────────────

function statusLineFromRow(row) {
  const assigned = row[COL.ASSIGNED - 1] || "";
  const oferta = row[COL.OFERTA - 1];
  const umowa = row[COL.UMOWA - 1];
  const note = row[COL.NOTE - 1] || "";
  const callhist = row[COL.CALLHIST - 1] || "";
  const nextcall = row[COL.NEXTCALL - 1] || "";
  const pkg = row[COL.PACKAGE - 1] || "";
  const guests = row[COL.GUESTS - 1] || "";
  const hours = row[COL.HOURS - 1] || "";
  const stage = inferLegacyLeadStage_(row);
  const hasMetaState = !!(assigned || oferta == "YES" || umowa == "YES");
  const guestLine = /\bos\.\b|osób|gości/i.test(String(guests)) ? guests : guests + " os.";

  let line = "\n───────────────\n";
  line += "📍 " + getLegacyLeadStageLabel_(stage) + "\n";
  if (hasMetaState) {
    line += assigned ? "👤 " + assigned + "  " : "👤 —  ";
    line += oferta == "YES" ? "📧 ✅  " : "📧 —  ";
    line += umowa == "YES" ? "📝 ✅" : "📝 —";
  }
  if (pkg) line += "\n📦 " + pkg;
  if (guests) line += "  👥 " + guestLine;
  if (hours) line += "\n🕐 " + hours;
  if (note) line += "\n🗒 " + note;
  if (callhist) line += "\n📋 " + callhist;
  if (nextcall) line += "\n🔔 Nast. kontakt: " + nextcall;
  return line;
}

function buildLeadText(row) {
  const name = row[COL.NAME - 1] || "";
  const phone = (row[COL.PHONE - 1] || "").toString().replace(/^'/, "");
  const email = row[COL.EMAIL - 1] || "";
  const event = row[COL.EVENT - 1] || "";
  const date = formatDate(row[COL.DATE - 1]);
  const city = row[COL.CITY - 1] || "";
  const guests = row[COL.GUESTS - 1] || "";
  const guestLine = /\bos\.\b|osób|gości/i.test(String(guests)) ? guests : guests + " os.";

  let text = "🔥 <b>NOWY LEAD</b>\n\n";
  text += "👤 <b>" + name + "</b>\n";
  if (phone) text += "📞 " + phone + "\n";
  if (email) text += "✉️ " + email + "\n";
  if (event) text += "🎉 " + event + "\n";
  if (date) text += "📅 " + date + "\n";
  if (city) text += "📍 " + city + "\n";
  if (guests) text += "👥 " + guestLine;
  return text.trim();
}

function baseLeadText(fullText) {
  return fullText
    .replace(/\n───────────────[\s\S]*$/, "")
    .replace(/^Potwierdzić[^\n]*\n\n/, "");
}

function isInCalendar(rowArr) {
  return !!(rowArr[COL.CAL_ID - 1] && rowArr[COL.CAL_ID - 1].toString().trim());
}

function calendarEventExists(calId) {
  if (!calId) return false;
  try {
    const ev = CalendarApp.getEventById(calId);
    return !!ev;
  } catch (e) { return false; }
}

function getLeadUID(rowArr) {
  return (rowArr[COL.UID - 1] || "").toString();
}

function helpText() {
  return "<b>Komendy (grupa)</b>\n\n" +
    "/leads — lista leadów z filtrami\n" +
    "/niezadzwonione — leady bez przypisania\n" +
    "/spam — lista spamu\n" +
    "/statystyki — podsumowanie\n" +
    "/export — eksport CSV do Telegram\n" +
    "/import — import leadów\n" +
    "/nowylead — dodaj lead\n" +
    "/kalendarz — najbliższe wydarzenia\n" +
    "/dashboard — odśwież dashboard\n" +
    "/diag — diagnostyka CRM\n" +
    "/ping — sprawdź bota\n" +
    "/help — przypnij pomoc\n\n" +
    "<b>Komendy (prywatne)</b>\n\n" +
    "/nowylead — dodaj lead (auto-przypisanie)\n" +
    "/moje — twoje leady\n" +
    "/zadania — twoje zadania\n" +
    "/zadanie — przypisz zadanie\n" +
    "/zadaniadone — wyczyść zadania\n" +
    "/rozliczenie — rozlicz wydarzenie\n" +
    "/kalendarz — wydarzenia\n" +
    "/diag — diagnostyka CRM";
}

function buildCrmDiagnosticsText_() {
  const config = getBarowoConfig_();
  const checks = [];

  try {
    const spreadsheet = getBarowoSpreadsheet_();
    checks.push("📊 Sheets: ✅ " + spreadsheet.getName());
  } catch (error) {
    checks.push("📊 Sheets: ❌ " + error.message);
  }

  checks.push("🤖 Bot token: " + (config.telegramBotToken ? "✅" : "❌"));
  checks.push("👥 Group chat: " + (config.telegramGroupChatId ? "✅ " + config.telegramGroupChatId : "❌"));
  checks.push("🔐 Relay secret: " + (config.telegramRelaySecret ? "✅" : "❌"));

  try {
    DriveApp.getFileById(CONFIG.UMOWA_TEMPLATE_ID).getName();
    checks.push("📄 Szablon umowy: ✅");
  } catch (error) {
    checks.push("📄 Szablon umowy: ❌ " + error.message);
  }

  try {
    DriveApp.getFileById(CONFIG.PDF_FILE_ID).getName();
    checks.push("📧 PDF oferty: ✅");
  } catch (error) {
    checks.push("📧 PDF oferty: ❌ " + error.message);
  }

  try {
    getBarowoCalendar();
    checks.push("📅 Kalendarz: ✅ " + CONFIG.CALENDAR_NAME);
  } catch (error) {
    checks.push("📅 Kalendarz: ❌ " + error.message);
  }

  if (config.telegramBotToken) {
    try {
      const webhookInfo = sendTelegramApiRequest_("getWebhookInfo", {});
      const webhookUrl = webhookInfo && webhookInfo.result ? webhookInfo.result.url : "";
      checks.push("🌐 Webhook: " + (webhookUrl ? "✅" : "❌") + (webhookUrl ? "\n" + webhookUrl : ""));
    } catch (error) {
      checks.push("🌐 Webhook: ❌ " + error.message);
    }
  }

  try {
    const leadHealth = inspectLeadFlowHealth_();
    if (leadHealth.ok) {
      checks.push("🩺 Lead flow: ✅");
    } else {
      checks.push("🩺 Lead flow: ❌ " + leadHealth.reason);
    }
  } catch (error) {
    checks.push("🩺 Lead flow: ❌ " + error.message);
  }

  return "<b>Diagnostyka CRM</b>\n\n" + checks.join("\n");
}

function sendCrmDiagnostics(chat, isPrivate, actorId) {
  const accessId = actorId || chat;
  if (!isAdmin(accessId)) {
    if (isPrivate) sendDM(chat, "❌ Tylko admin może uruchomić diagnostykę.");
    else sendTemp(chat, "❌ Tylko admin może uruchomić diagnostykę.");
    return;
  }

  const text = buildCrmDiagnosticsText_();
  if (isPrivate) sendDM(chat, text);
  else sendTemp(chat, text, null, CONFIG.TTL_LIST);
}

// ─── Messages ────────────────────────────────────────────────────────────────

function handleMessage(msg) {
  const text = msg.text || "";
  const chat = msg.chat.id;
  const msgId = msg.message_id;
  const userId = msg.from ? msg.from.id : chat;

  if (!isAllowed(userId) && !isAllowed(chat)) { deleteMsg(chat, msgId); return; }
  if (!isDM(chat)) deleteMsg(chat, msgId);

  // High-priority commands should work even if the bot is currently waiting
  // for note/next-call/task input from the same user.
  if (text == "/ping") {
    clearState(chat);
    if (isDM(chat)) sendDM(chat, "🟢 Bot działa.\n📅 " + formatDate(new Date()));
    else sendTemp(chat, "🟢 Bot działa.\n📅 " + formatDate(new Date()));
    return;
  }
  if (text == "/help") {
    clearState(chat);
    if (isDM(chat)) { sendDM(chat, helpText()); }
    else { unpinAll(chat); const id = send(chat, helpText()); if (id) pinMsg(chat, id); }
    return;
  }
  if (text == "/start" && isDM(chat)) {
    clearState(chat);
    const who = whoIsUser(chat);
    sendDM(chat, "👋 Cześć" + (who ? " " + who : "") + "!\nWybierz opcję z menu poniżej.");
    return;
  }

  // ─── State handlers ───
  const st = getState(chat);
  if (st) {
    clearState(chat);

    if (st.action == "note") {
      withLock(function () {
        const sh = sheetLidy();
        const row = findRowByUID(sh, st.uid);
        if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
        const newNote = text.trim() == "-" ? "" : text.trim();
        sh.getRange(row, COL.NOTE).setValue(newNote);
        const updatedLead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
        edit(st.cardChat || chat, st.cardMsgId,
          baseLeadText(st.leadText) + statusLineFromRow(updatedLead),
          leadKeyboard_(st.uid, updatedLead));
        sendTemp(chat, newNote ? "🗒 Notatka zapisana" : "🗒 Notatka usunięta");
        logAction(whoIsUser(chat), "note", updatedLead[COL.NAME - 1], newNote);
      });
      return;
    }

    if (st.action == "nextcall") {
      withLock(function () {
        const sh = sheetLidy();
        const row = findRowByUID(sh, st.uid);
        if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
        // Поддержка формата DD.MM.YYYY или DD.MM.YYYY HH:MM
        const input = text.trim();
        const parts = input.split(" ");
        const datePart = parts[0];
        const timePart = parts.length > 1 ? parts[1] : "";
        const d = parseDate(datePart);
        if (isNaN(d.getTime())) { sendTemp(chat, "❌ Format: DD.MM.YYYY lub DD.MM.YYYY HH:MM"); return; }
        const fullValue = timePart ? datePart + " " + timePart : datePart;
        sh.getRange(row, COL.NEXTCALL).setValue(fullValue);
        const updatedLead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
        edit(st.cardChat || chat, st.cardMsgId,
          baseLeadText(st.leadText) + statusLineFromRow(updatedLead),
          leadKeyboard_(st.uid, updatedLead));
        sendTemp(chat, "🔔 Następny kontakt: <b>" + fullValue + "</b>");
      });
      return;
    }

    if (st.action == "search") {
      sendLeadsList(chat, "search", text.trim());
      return;
    }

    if (st.action == "import") {
      importLeads(chat, text);
      return;
    }

    if (st.action == "newlead") {
      withLock(function () {
        const p = text.split(",");
        if (p.length < 6) {
          sendTemp(chat, "❌ Format: <code>Imię,Telefon,Email,Miasto,Data,Wydarzenie</code>");
          return;
        }
        const sh = sheetLidy();
        const fields = {
          name: p[0].trim(),
          phone: p[1].trim(),
          email: p[2].trim(),
          city: p[3].trim(),
          date: p[4].trim(),
          event: p[5].trim()
        };
        const duplicateRow = findDuplicateLegacyLeadRow_(sh, fields.name, fields.phone, fields.email);
        if (duplicateRow > 0) {
          const duplicateLead = sh.getRange(duplicateRow, 1, 1, sh.getLastColumn()).getValues()[0];
          sendTemp(chat, "♻️ Duplikat: <b>" + fields.name + "</b> już istnieje jako lead.");
          syncLegacyLeadToModernCrm_(duplicateLead);
          return;
        }

        let assignedName = "";
        if (isDM(chat)) {
          assignedName = whoIsUser(chat) || "";
        }
        const newRow = buildManualLegacyLeadRow_(fields, isDM(chat) ? "manual_dm" : "manual_group", assignedName);
        sh.getRange(sh.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);
        addToKontakty(newRow);
        syncLegacyLeadToModernCrm_(newRow);
        const assignMsg = newRow[COL.ASSIGNED - 1] ? "\n👤 Przypisano: <b>" + newRow[COL.ASSIGNED - 1] + "</b>" : "";
        sendTemp(chat, "✅ Lead dodany: <b>" + p[0].trim() + "</b>" + assignMsg);
        logAction(whoIsUser(chat), "new_lead", p[0].trim());
      });
      return;
    }

    // Розлічення
    if (st.action && st.action.startsWith("rozl_")) {
      handleRozliczenieStep(chat, st, text.trim());
      return;
    }

    // Архів
    if (st.action == "archiwum") {
      importArchiwum(chat, text);
      return;
    }

    // Задание
    if (st.action == "task_text") {
      const taskText = text.trim();
      if (!taskText) { sendDM(chat, "❌ Wpisz treść zadania."); return; }
      const from = whoIsUser(chat) || "Bot";
      const targetId = st.targetId;
      const targetName = st.targetName;
      const key = "tasks_" + targetId;
      const props = PropertiesService.getScriptProperties();
      let tasks = [];
      try { const raw = props.getProperty(key); if (raw) tasks = JSON.parse(raw); } catch (e) { }
      tasks.push({ text: taskText, from: from, date: formatDate(new Date()) });
      props.setProperty(key, JSON.stringify(tasks));
      sendDM(targetId, "📌 <b>Nowe zadanie od " + from + ":</b>\n\n" + taskText);
      sendDM(chat, "✅ Zadanie wysłane do <b>" + targetName + "</b>:\n" + taskText);
      logAction(from, "task_assign", targetName, taskText);
      return;
    }

    // Генерация умовы — ввод данных
    if (st.action == "gen_guests") {
      const val = parseInt(text.trim());
      if (isNaN(val) || val < 1) { sendTemp(chat, "❌ Podaj liczbę gości (np. 80)"); return; }
      withLock(function () { sheetLidy().getRange(findRowByUID(sheetLidy(), st.uid), COL.GUESTS).setValue(val); });
      setState(chat, { action: "gen_hours", uid: st.uid, pkg: st.pkg });
      send(chat, "🕐 Godziny pracy (np. <code>18:00-02:00</code>):");
      return;
    }
    if (st.action == "gen_hours") {
      withLock(function () { sheetLidy().getRange(findRowByUID(sheetLidy(), st.uid), COL.HOURS).setValue(text.trim()); });
      const sh = sheetLidy();
      const row = findRowByUID(sh, st.uid);
      if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
      const lead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
      const suggestedName = getLeadContractClientName_(lead);
      setState(chat, { action: "gen_client_name", uid: st.uid, pkg: st.pkg });
      send(chat,
        "🧾 Podaj imię i nazwisko lub nazwę klienta do umowy:" +
        (suggestedName ? "\n<i>Obecnie: " + escapeHtml_(suggestedName) + "</i>" : "")
      );
      return;
    }
    if (st.action == "gen_client_name") {
      const value = text.trim();
      if (!value) { sendTemp(chat, "❌ Podaj imię i nazwisko lub nazwę klienta."); return; }
      withLock(function () { sheetLidy().getRange(findRowByUID(sheetLidy(), st.uid), COL.CLIENT_FULL_NAME).setValue(value); });
      setState(chat, { action: "gen_client_address", uid: st.uid, pkg: st.pkg });
      send(chat, "📍 Podaj adres klienta do umowy:");
      return;
    }
    if (st.action == "gen_client_address") {
      const value = text.trim();
      if (!value) { sendTemp(chat, "❌ Podaj adres klienta."); return; }
      withLock(function () { sheetLidy().getRange(findRowByUID(sheetLidy(), st.uid), COL.CLIENT_ADDRESS).setValue(value); });
      askPrice(chat, st.uid, st.pkg);
      return;
    }
    if (st.action == "gen_price") {
      const val = parseInt(text.trim());
      if (isNaN(val) || val < 1) { sendTemp(chat, "❌ Podaj kwotę liczbowo (np. 6500)"); return; }
      generateUmowa(chat, st.uid, st.pkg, val);
      return;
    }
    return;
  }

  // DM commands
  if (isDM(chat)) {
    if (text == "/nowylead" || text == "➕ Nowy lead") {
      setState(chat, { action: "newlead" });
      sendDM(chat, "➕ <b>Nowy lead</b>\n\n<code>Imię,Telefon,Email,Miasto,Data,Wydarzenie</code>\n\nLead zostanie auto-przypisany.");
      return;
    }
    if (text == "/moje" || text == "📋 Moje leady") {
      const who = whoIsUser(chat);
      if (!who) { sendDM(chat, "❌ Nie rozpoznaję Cię."); return; }
      sendLeadsList(chat, who.toLowerCase());
      return;
    }
    if (text == "/zadania" || text == "📌 Zadania") { sendMyTasks(chat); return; }
    if (text == "/zadanie" || text == "✏️ Nowe zadanie") {
      const who = whoIsUser(chat);
      if (!who) { sendDM(chat, "❌ Nie rozpoznaję Cię."); return; }
      const buttons = [];
      for (const [id, m] of Object.entries(CONFIG.TEAM)) {
        buttons.push([{ text: "👤 " + m.name, callback_data: "taskfor_" + m.name.toLowerCase() }]);
      }
      sendDM(chat, "📌 <b>Komu przypisać zadanie?</b>", { inline_keyboard: buttons });
      return;
    }
    if (text == "/rozliczenie" || text == "💰 Rozliczenie") { startRozliczenie(chat); return; }
    if (text == "/szukaj") {
      setState(chat, { action: "search" });
      sendDM(chat, "🔍 Wpisz imię lub numer:");
      return;
    }
    if (text == "/zadaniadone") {
      PropertiesService.getScriptProperties().deleteProperty("tasks_" + chat);
      sendDM(chat, "✅ Lista zadań wyczyszczona.");
      return;
    }
    if (text == "/diag") { sendCrmDiagnostics(chat, true, userId); return; }
    if (text == "/kalendarz" || text == "📅 Kalendarz") { sendCalendarEvents(chat); return; }
    if (text == "/help") { sendDM(chat, helpText()); return; }
    if (text == "/archiwum") {
      if (!isAdmin(chat)) { sendDM(chat, "❌ Tylko admin może dodawać archiwalne leady."); return; }
      setState(chat, { action: "archiwum" });
      sendDM(chat,
        "📦 <b>Archiwum — dodaj podpisane umowy</b>\n\n" +
        "Wyślij dane (jeden klient na linię):\n" +
        "<code>Imię,Miasto,Data,Pakiet,Kwota</code>\n\n" +
        "Przykład:\n" +
        "<code>Kowalska,Gdańsk,15.06.2025,Standard,6500\nNowak,Sopot,22.07.2025,Premium,10000</code>"
      );
      return;
    }
    return;
  }

  // Group commands (убрана /szukaj — дублирует Telegram поиск)
  if (text == "/leads") { const id = send(chat, "📂 <b>Wybierz filtr:</b>", leadsMenuKeyboard()); scheduleDelete(chat, id, CONFIG.TTL_LIST); return; }
  if (text == "/niezadzwonione") { sendNocallList(chat); return; }
  if (text == "/spam") { sendSpamList(chat); return; }
  if (text == "/statystyki") { sendStats(chat); return; }
  if (text == "/export") { exportCSV(chat); return; }
  if (text == "/diag") { sendCrmDiagnostics(chat, false, userId); return; }
  if (text == "/import") {
    setState(chat, { action: "import" });
    const id = send(chat, "📥 <b>Import leadów</b>\n\n<code>Imię,Telefon,Email,Miasto,Data,Wydarzenie</code>");
    scheduleDelete(chat, id, CONFIG.TTL_LIST); return;
  }
  if (text == "/nowylead") {
    setState(chat, { action: "newlead" });
    const id = send(chat, "➕ <b>Nowy lead</b>\n\n<code>Imię,Telefon,Email,Miasto,Data,Wydarzenie</code>");
    scheduleDelete(chat, id, CONFIG.TTL_LIST); return;
  }
  if (text == "/kalendarz") { sendCalendarEvents(chat); return; }
  if (text == "/dashboard") { updateDashboard(); sendTemp(chat, "📊 Dashboard odświeżony."); return; }
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

function handleCallback(q) {
  const chat = q.message.chat.id;
  const msgId = q.message.message_id;
  const text = q.message.text || "";
  const data = q.data;
  const userId = q.from ? q.from.id : chat;

  if (!isAllowed(userId) && !isAllowed(chat)) { answer(q.id, "⛔ Brak dostępu"); return; }
  answer(q.id);

  if (data.startsWith("rozl_")) { startRozliczenieForLead(chat, data.replace("rozl_", "")); return; }

  // Задание — выбор получателя
  if (data.startsWith("taskfor_")) {
    const targetName = data.replace("taskfor_", "");
    const targetId = getTeamIdByName(targetName.charAt(0).toUpperCase() + targetName.slice(1));
    const displayName = targetName.charAt(0).toUpperCase() + targetName.slice(1);
    deleteMsg(chat, msgId);
    setState(chat, { action: "task_text", targetId: targetId, targetName: displayName });
    sendDM(chat, "📝 Wpisz treść zadania dla <b>" + displayName + "</b>:");
    return;
  }

  // Задание — выполнено
  if (data.startsWith("taskdone_")) {
    const taskIdx = parseInt(data.replace("taskdone_", ""));
    const props = PropertiesService.getScriptProperties();
    const taskKey = "tasks_" + chat;
    try {
      const raw = props.getProperty(taskKey);
      if (raw) {
        let tasks = JSON.parse(raw);
        if (taskIdx >= 0 && taskIdx < tasks.length) {
          const done = tasks[taskIdx];
          tasks.splice(taskIdx, 1);
          if (tasks.length > 0) props.setProperty(taskKey, JSON.stringify(tasks));
          else props.deleteProperty(taskKey);
          const doneBy = whoIsUser(chat) || "?";
          const fromId = getTeamIdByName(done.from);
          if (fromId && fromId != chat.toString()) {
            sendDM(fromId, "✅ <b>" + doneBy + "</b> wykonał zadanie:\n" + done.text);
          }
          deleteMsg(chat, msgId);
          sendMyTasks(chat);
          logAction(doneBy, "task_done", "", done.text);
          return;
        }
      }
    } catch (e) { }
    return;
  }

  // gu_ = gen umowa package
  if (data.startsWith("gu_")) {
    handleGenUmowaPkg(chat, msgId, text, data);
    return;
  }

  // cprice_ = confirm price
  if (data.startsWith("cprice_")) {
    const parts = data.replace("cprice_", "").split("_");
    const price = parseInt(parts[0]);
    const uid = parts[1];
    const pkg = parts[2];
    clearState(chat);
    deleteMsg(chat, msgId);
    generateUmowa(chat, uid, pkg, price);
    return;
  }

  // Разбираем callback
  const firstUnder = data.indexOf("_");
  const action = data.substring(0, firstUnder);
  const uid = data.substring(firstUnder + 1);

  if (action == "back") {
    withLock(function () {
      const sh = sheetLidy();
      const row = findRowByUID(sh, uid);
      if (row < 0) { edit(chat, msgId, "❌ Lead nie znaleziony.", { inline_keyboard: [] }); return; }
      const lead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
      edit(chat, msgId, baseLeadText(text) + statusLineFromRow(lead), leadKeyboard_(uid, lead));
    });
    return;
  }

  if (action == "leads") { deleteMsg(chat, msgId); sendLeadsList(chat, uid); return; }

  if (action == "opencall") {
    const sh = sheetLidy();
    const row = findRowByUID(sh, uid);
    if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
    const lead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    deleteMsg(chat, msgId);
    send(chat, buildLeadText(lead) + statusLineFromRow(lead), leadKeyboard_(uid, lead));
    return;
  }

  if (action == "restore") { restoreFromSpam(chat, uid, msgId); return; }

  if (action == "note") {
    setState(chat, { action: "note", uid: uid, cardMsgId: msgId, cardChat: chat, leadText: text });
    const id = send(chat, "🗒 Wpisz notatkę:\n<i>(wyślij '-' aby usunąć)</i>");
    scheduleDelete(chat, id, CONFIG.TTL_DEFAULT); return;
  }

  if (action == "nextcall") {
    setState(chat, { action: "nextcall", uid: uid, cardMsgId: msgId, cardChat: chat, leadText: text });
    const id = send(chat, "🔔 Kiedy zadzwonić? <b>(DD.MM.YYYY)</b> lub <b>(DD.MM.YYYY HH:MM)</b>:");
    scheduleDelete(chat, id, CONFIG.TTL_DEFAULT); return;
  }

  if (action == "draft") {
    const sh = sheetLidy();
    const leadRef = getLeadRowDataByUid_(sh, uid);
    if (!leadRef) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
    edit(chat, msgId, baseLeadText(text) + statusLineFromRow(leadRef.rowData), packageKeyboard(uid));
    return;
  }

  if (action == "pkg") {
    // pkg_simple_UID, pkg_standard_UID, pkg_premium_UID
    const parts2 = data.split("_");
    const pkgKey = parts2[1];
    const pkgUid = parts2.slice(2).join("_");
    createEmailDraft(chat, pkgUid, pkgKey, msgId, text);
    return;
  }

  if (action == "genumowa") {
    const sh = sheetLidy();
    const leadRef = getLeadRowDataByUid_(sh, uid);
    if (!leadRef) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
    edit(chat, msgId, baseLeadText(text) + statusLineFromRow(leadRef.rowData), genPkgKb(uid));
    return;
  }

  if (action == "cal") {
    withLock(function () {
      const sh = sheetLidy();
      const row = findRowByUID(sh, uid);
      if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
      const lead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
      if (isInCalendar(lead)) {
        sendTemp(chat, "📅 Już jest w kalendarzu.");
        return;
      }
      const result = addToCalendar(lead);
      if (result.ok) {
        sh.getRange(row, COL.CAL_ID).setValue(result.calEventId);
        const updatedLead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
        edit(chat, msgId, baseLeadText(text) + statusLineFromRow(updatedLead), keyboard(uid, true));
        sendTemp(chat, "📅 Dodano: <b>" + result.title + "</b> · " + result.date);
        logAction(whoIsUser(userId), "calendar_add", lead[COL.NAME - 1]);
      } else { sendTemp(chat, "❌ Błąd kalendarza: " + result.err); }
    });
    return;
  }

  if (action == "calcheck") { sendCalendarEvents(chat); return; }

  if (action == "spam") {
    edit(chat, msgId, "Potwierdzić przeniesienie do spamu?\n\n" + baseLeadText(text), confirmKeyboard("spam", uid));
    return;
  }

  if (action == "delete") {
    edit(chat, msgId, "Potwierdzić usunięcie leada?\n\n" + baseLeadText(text), confirmKeyboard("delete", uid));
    return;
  }

  if (action == "assign") {
    const assignParts = uid.split("_");
    const memberSlug = assignParts[0];
    const assignUid = assignParts.slice(1).join("_");
    let memberName = null;
    for (const member of Object.values(CONFIG.TEAM)) {
      if (slugifyTeamName_(member.name) === memberSlug) {
        memberName = member.name.toLowerCase();
        break;
      }
    }
    if (!memberName) { sendTemp(chat, "❌ Nieznany członek zespołu."); return; }
    applyAction(chat, msgId, text, memberName, assignUid, userId);
    return;
  }

  const isLegacyNamedAction = Object.values(CONFIG.TEAM).some(function (member) {
    return member.name.toLowerCase() === action;
  });
  if (isLegacyNamedAction || action == "oferta" || action == "umowa") {
    applyAction(chat, msgId, text, action, uid, userId);
    return;
  }

  if (action == "confirm") {
    const parts3 = uid.split("_"); // "spam_UID" or "delete_UID"
    const confirmAction = parts3[0];
    const confirmUid = parts3.slice(1).join("_");
    if (confirmAction == "spam") { moveToSpam(chat, confirmUid, msgId, text, userId); return; }
    if (confirmAction == "delete") {
      withLock(function () {
        const sh = sheetLidy();
        const row = findRowByUID(sh, confirmUid);
        if (row < 0) { edit(chat, msgId, "❌ Lead nie znaleziony.", { inline_keyboard: [] }); return; }
        const rowData = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
        const leadName = rowData[COL.NAME - 1];
        rowData[COL.LEAD_STATUS - 1] = LEGACY_LEAD_STAGE.DELETED;
        syncLegacyLeadToModernCrm_(rowData);
        removeFromKontakty(rowData);
        removeFromCalendar(sh, row, rowData);
        sh.deleteRow(row);
        edit(chat, msgId, "❌ Lead usunięty.", { inline_keyboard: [] });
        scheduleDelete(chat, msgId, CONFIG.TTL_CONFIRM);
        logAction(whoIsUser(userId), "delete", leadName);
      });
      return;
    }
  }
}

// ─── Lock helper ─────────────────────────────────────────────────────────────

function withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1500)) {
    throw buildBusyError_();
  }

  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ─── Gen umowa package callback ──────────────────────────────────────────────

function handleGenUmowaPkg(chat, msgId, text, data) {
  const parts = data.split("_"); // ["gu","simple","UID..."]
  const pkgRaw = parts[1];
  const uid = parts.slice(2).join("_");
  const pkgMap = { simple: "simple", std: "standard", prem: "premium" };
  const pkg = pkgMap[pkgRaw] || "standard";

  withLock(function () {
    const sh = sheetLidy();
    const row = findRowByUID(sh, uid);
    if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
    const lead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];

    sh.getRange(row, COL.PACKAGE).setValue(CONFIG.PACKAGES[pkg].name);
    const refreshedLead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    edit(chat, msgId, baseLeadText(text) + statusLineFromRow(refreshedLead), leadKeyboard_(uid, refreshedLead));

    if (!lead[COL.GUESTS - 1]) {
      setState(chat, { action: "gen_guests", uid: uid, pkg: pkg });
      send(chat, "👥 Podaj liczbę gości:");
      return;
    }
    if (!lead[COL.HOURS - 1]) {
      setState(chat, { action: "gen_hours", uid: uid, pkg: pkg });
      send(chat, "🕐 Godziny pracy (np. <code>18:00-02:00</code>):");
      return;
    }

    const clientName = getLeadContractClientName_(lead);
    setState(chat, { action: "gen_client_name", uid: uid, pkg: pkg });
    send(chat,
      "🧾 Podaj imię i nazwisko lub nazwę klienta do umowy:" +
      (clientName ? "\n<i>Obecnie: " + escapeHtml_(clientName) + "</i>" : "")
    );
    return;
  });
}

function askPrice(chat, uid, pkg) {
  const sh = sheetLidy();
  const row = findRowByUID(sh, uid);
  if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
  const lead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
  const pkgData = CONFIG.PACKAGES[pkg] || CONFIG.PACKAGES.standard;
  const guests = parseInt(lead[COL.GUESTS - 1]) || 50;
  const autoPrice = guests <= 50 ? pkgData.prices[50] : pkgData.prices[100];
  const priceStr = autoPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  setState(chat, { action: "gen_price", uid: uid, pkg: pkg });
  send(chat,
    "💰 <b>Sugerowana cena: " + priceStr + " zł</b>\n" +
    "(" + pkgData.name + " · " + guests + " os.)\n\n" +
    "Zatwierdź lub wpisz własną kwotę:",
    {
      inline_keyboard: [
        [{ text: "✅ " + priceStr + " zł", callback_data: "cprice_" + autoPrice + "_" + uid + "_" + pkg }]
      ]
    }
  );
}

// ─── Apply action (с уведомлениями) ──────────────────────────────────────────

function applyAction(chat, msgId, text, action, uid, userId) {
  withLock(function () {
    const sh = sheetLidy();
    const row = findRowByUID(sh, uid);
    if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
    const lastColumn = sh.getLastColumn();
    const rowData = sh.getRange(row, 1, 1, lastColumn).getValues()[0];

    const nameMap = {};
    for (const m of Object.values(CONFIG.TEAM)) {
      nameMap[m.name.toLowerCase()] = m.name;
    }

    const isTeamAction = !!nameMap[action];
    const cell = isTeamAction ? COL.ASSIGNED : (action == "oferta" ? COL.OFERTA : COL.UMOWA);
    const val = isTeamAction ? nameMap[action] : "YES";
    const cur = rowData[cell - 1];

    if (cur == val) {
      edit(chat, msgId, baseLeadText(text) + statusLineFromRow(rowData), leadKeyboard_(uid, rowData));
      return;
    } else {
      sh.getRange(row, cell).setValue(val);
      if (isTeamAction) {
        setLegacyLeadStage_(sh, row, LEGACY_LEAD_STAGE.ASSIGNED);
        appendCallHistory(sh, row, val);
        // Уведомление назначенному
        const assignedId = getTeamIdByName(val);
        if (assignedId && assignedId !== userId.toString()) {
          const leadName = rowData[COL.NAME - 1] || "";
          const leadPhone = rowData[COL.PHONE - 1] || "";
          sendDM(assignedId, "📋 <b>Przypisano Ci lead:</b>\n👤 " + leadName + "\n📞 " + leadPhone);
        }
      }
      if (action == "oferta") {
        setLegacyLeadStage_(sh, row, LEGACY_LEAD_STAGE.OFFER_SENT);
      }
      if (action == "umowa") {
        setLegacyLeadStage_(sh, row, LEGACY_LEAD_STAGE.SIGNED);
        const rd = sh.getRange(row, 1, 1, lastColumn).getValues()[0];
        if (!isInCalendar(rd) || !calendarEventExists(rd[COL.CAL_ID - 1])) {
          const r = addToCalendar(rd);
          if (r.ok) sh.getRange(row, COL.CAL_ID).setValue(r.calEventId);
        }
        updateKontaktyStatus(rd, "signed");
      }
      const syncedLead = sh.getRange(row, 1, 1, lastColumn).getValues()[0];
      syncLegacyLeadToModernCrm_(syncedLead);
      logAction(whoIsUser(userId), "set_" + action, syncedLead[COL.NAME - 1], val);
      edit(chat, msgId, baseLeadText(text) + statusLineFromRow(syncedLead), leadKeyboard_(uid, syncedLead));
      return;
    }
  });
}

// ─── Generate Umowa (ОДНО сообщение вместо 7) ────────────────────────────────

function generateUmowa(chat, uid, pkgKey, customPrice) {
  const waitMsgId = send(chat, "⏳ Generuję umowę...");
  try {
    const sh = sheetLidy();
    const row = findRowByUID(sh, uid);
    if (row < 0) { deleteMsg(chat, waitMsgId); sendTemp(chat, "❌ Lead nie znaleziony."); return; }
    const lead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    const pkg = CONFIG.PACKAGES[pkgKey] || CONFIG.PACKAGES.standard;
    const date = formatDate(lead[COL.DATE - 1]);
    const city = lead[COL.CITY - 1] || "";
    const guests = parseInt(lead[COL.GUESTS - 1]) || 50;
    const hours = lead[COL.HOURS - 1] || "18:00-02:00";
    const price = customPrice || (guests <= 50 ? pkg.prices[50] : pkg.prices[100]);
    const balance = Math.max(0, price - CONFIG.DEPOSIT);
    const clientFullName = getLeadContractClientName_(lead);
    const clientAddress = getLeadContractClientAddress_(lead);
    const eventDate = parseDate(lead[COL.DATE - 1]);
    let depositDate = new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Фикс: если дата залога в прошлом → завтра
    if (depositDate < today) {
      depositDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }
    const todayStr = formatDate(new Date());

    const counterLock = LockService.getScriptLock();
    counterLock.waitLock(5000);
    let umowaNum = "";
    try {
      const props = PropertiesService.getScriptProperties();
      let umowaCount = parseInt(props.getProperty("umowa_counter") || "0");
      umowaCount++;
      props.setProperty("umowa_counter", umowaCount.toString());
      umowaNum = umowaCount + " / " + new Date().getFullYear();
    } finally {
      counterLock.releaseLock();
    }

    const templateFile = DriveApp.getFileById(CONFIG.UMOWA_TEMPLATE_ID);
    const copy = templateFile.makeCopy("Umowa_" + CONFIG.BRAND + "_" + date.replace(/\./g, ""));
    const doc = DocumentApp.openById(copy.getId());
    const body = doc.getBody();

    body.replaceText("\\{\\{UMOWA_NR\\}\\}", umowaNum);
    body.replaceText("\\{\\{TODAY\\}\\}", todayStr);
    body.replaceText("\\{\\{EVENT_DATE\\}\\}", date);
    body.replaceText("\\{\\{CITY\\}\\}", city);
    body.replaceText("\\{\\{ZLECENIODAWCA\\}\\}", clientFullName);
    body.replaceText("\\{\\{ADDRESS\\}\\}", clientAddress);
    body.replaceText("\\{\\{GUESTS\\}\\}", guests.toString());
    body.replaceText("\\{\\{PRICE\\}\\}", price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "));
    body.replaceText("\\{\\{BALANCE\\}\\}", balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "));
    body.replaceText("\\{\\{DEPOSIT\\}\\}", CONFIG.DEPOSIT.toString());
    body.replaceText("\\{\\{DEPOSIT_DATE\\}\\}", formatDate(depositDate));
    body.replaceText("\\{\\{EXTRA_HOUR\\}\\}", CONFIG.EXTRA_HOUR.toString());
    body.replaceText("\\{\\{PENALTY\\}\\}", CONFIG.PENALTY.toString());
    body.replaceText("\\{\\{HOURS\\}\\}", hours);
    body.replaceText("\\{\\{PACKAGE\\}\\}", pkg.name);

    doc.saveAndClose();

    const url = "https://docs.google.com/document/d/" + copy.getId() + "/export?format=pdf";
    const pdfBlob = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() } })
      .getBlob().setName("Umowa_" + CONFIG.BRAND + "_" + date.replace(/\./g, "") + ".pdf");

    deleteMsg(chat, waitMsgId);

    sendDocument(chat, pdfBlob,
      "📄 <b>Umowa nr " + umowaNum + "</b>\n" +
      "📅 " + date + " · " + city + "\n" +
      "📦 " + pkg.name + " · " + price + " zł\n" +
      "💳 Pozostało: " + balance + " zł\n" +
      "👥 " + guests + " os. · 🕐 " + hours);

    sh.getRange(row, COL.LEAD_STATUS).setValue(LEGACY_LEAD_STAGE.CONTRACT_GENERATED);
    const updatedLead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    syncLegacyLeadToModernCrm_(updatedLead);
    DriveApp.getFileById(copy.getId()).setTrashed(true);
    logAction(whoIsUser(chat), "gen_umowa", lead[COL.NAME - 1], umowaNum + " · " + price + " zł");

  } catch (e) {
    deleteMsg(chat, waitMsgId);
    notifyError("generateUmowa", e);
    sendTemp(chat, "❌ Błąd generowania umowy: " + e);
  }
}

// ─── Rozliczenie ─────────────────────────────────────────────────────────────

function handleRozliczenieStep(chat, st, val) {
  const num = parseFloat(val);
  const steps = ["rozl_revenue", "rozl_alcohol", "rozl_transport", "rozl_staff", "rozl_other", "rozl_tips"];
  const prompts = [null, "🍾 Koszty alkoholu i lodu (zł):", "🚗 Koszty transportu (zł):",
    "👨‍🍳 Koszty barmana (zł):", "📦 Inne koszty (zł):\n<i>(0 jeśli brak)</i>", "💰 Napiwki (zł):\n<i>(0 jeśli brak)</i>"];
  const fieldMap = {
    rozl_revenue: "revenue", rozl_alcohol: "alcohol", rozl_transport: "transport",
    rozl_staff: "staff", rozl_other: "other", rozl_tips: "tips"
  };

  if (isNaN(num)) { sendTemp(chat, "❌ Podaj kwotę liczbowo"); return; }

  st[fieldMap[st.action]] = num;
  const idx = steps.indexOf(st.action);

  if (idx < steps.length - 1) {
    st.action = steps[idx + 1];
    st.ts = new Date().getTime();
    PropertiesService.getScriptProperties().setProperty("state_" + chat, JSON.stringify(st));
    send(chat, prompts[idx + 1]);
  } else {
    const totalCosts = (st.alcohol || 0) + (st.transport || 0) + (st.staff || 0) + (st.other || 0);
    const net = (st.revenue || 0) - totalCosts + (st.tips || 0);
    sheetFinanse().appendRow([
      formatDate(new Date()), st.leadName, st.leadEvent, st.leadPkg || "",
      st.revenue, st.alcohol || 0, st.transport || 0, st.staff || 0, st.other || 0,
      st.tips, net, whoIsUser(chat) || ""
    ]);
    send(chat,
      "✅ <b>Rozliczenie zapisane!</b>\n\n👤 " + st.leadName + "\n" +
      "💵 Przychód: <b>" + (st.revenue || 0) + " zł</b>\n" +
      "📉 Koszty: <b>" + totalCosts + " zł</b>\n" +
      "💰 Napiwki: <b>" + (st.tips || 0) + " zł</b>\n───────────────\n" +
      "📊 Zysk netto: <b>" + net + " zł</b>"
    );
    updateDashboard();
    logAction(whoIsUser(chat), "rozliczenie", st.leadName, net + " zł netto");
  }
}

function startRozliczenie(chat) {
  const who = whoIsUser(chat);
  if (!who) { send(chat, "❌ Nie rozpoznaję Cię."); return; }
  const rows = sheetLidy().getDataRange().getValues();
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const leads = [];

  // Используем UID для проверки вместо имя+дата
  const fsh = sheetFinanse(); const fRows = fsh.getDataRange().getValues();
  const settled = new Set();
  for (let i = 1; i < fRows.length; i++) {
    settled.add((fRows[i][FCOL.NAME - 1] || "") + "_" + (fRows[i][FCOL.DATE - 1] || ""));
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.UMOWA - 1] != "YES") continue;
    if (rows[i][COL.ASSIGNED - 1] != who && rows[i][COL.ASSIGNED - 1]) continue;
    const d = parseDate(rows[i][COL.DATE - 1]);
    if (!isNaN(d.getTime()) && d > today) continue;
    const key = (rows[i][COL.NAME - 1] || "") + "_" + formatDate(rows[i][COL.DATE - 1]);
    if (settled.has(key)) continue;
    const uid = getLeadUID(rows[i]);
    leads.push({
      name: rows[i][COL.NAME - 1], event: rows[i][COL.EVENT - 1] || "",
      date: formatDate(rows[i][COL.DATE - 1]), uid: uid
    });
  }
  if (leads.length == 0) { sendDM(chat, "📭 Brak wydarzeń do rozliczenia."); return; }
  sendDM(chat, "💰 <b>Wybierz wydarzenie:</b>",
    { inline_keyboard: leads.map(l => [{ text: "📋 " + l.name + " · " + l.date, callback_data: "rozl_" + l.uid }]) });
}

function startRozliczenieForLead(chat, uid) {
  const sh = sheetLidy();
  const row = findRowByUID(sh, uid);
  if (row < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
  const rows = sh.getDataRange().getValues();
  const lead = rows[row - 1];
  setState(chat, {
    action: "rozl_revenue", leadUid: uid, leadName: lead[COL.NAME - 1] || "",
    leadEvent: lead[COL.EVENT - 1] || "", leadPkg: lead[COL.PACKAGE - 1] || ""
  });
  send(chat, "💰 <b>Rozliczenie:</b> " + (lead[COL.NAME - 1] || "") + "\n\nPodaj przychód od klienta (zł):");
}

// ─── My Tasks (DM) ──────────────────────────────────────────────────────────

function sendMyTasks(chat) {
  const who = whoIsUser(chat);
  if (!who) { send(chat, "❌ Nie rozpoznaję Cię."); return; }
  const rows = sheetLidy().getDataRange().getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let txt = "📋 <b>Twoje zadania, " + who + "</b>\n\n"; let count = 0;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.ASSIGNED - 1] != who) continue;
    const nc = rows[i][COL.NEXTCALL - 1];
    if (nc) {
      const ncStr = nc.toString().trim();
      const datePart = ncStr.split(" ")[0];
      const timePart = ncStr.split(" ")[1] || "";
      const nd = parseDate(datePart); nd.setHours(0, 0, 0, 0);
      if (nd.getTime() <= today.getTime()) {
        txt += "🔔 Zadzwoń: <b>" + rows[i][COL.NAME - 1] + "</b> · 📞 " + rows[i][COL.PHONE - 1];
        if (timePart) txt += " · 🕐 " + timePart;
        txt += "\n"; count++;
      }
    }
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.ASSIGNED - 1] != who || rows[i][COL.UMOWA - 1] != "YES") continue;
    const d = parseDate(rows[i][COL.DATE - 1]); if (isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0); const diff = (d - today) / 86400000;
    if (diff > 0 && diff <= 7) {
      txt += "📅 Za " + Math.round(diff) + " dni: <b>" + rows[i][COL.NAME - 1] + "</b> · " + rows[i][COL.CITY - 1] + "\n"; count++;
    }
    if (diff == 0) {
      txt += "🎉 <b>Dziś!</b> " + rows[i][COL.NAME - 1] + " · " + rows[i][COL.CITY - 1] +
        (rows[i][COL.HOURS - 1] ? " · " + rows[i][COL.HOURS - 1] : "") + "\n"; count++;
    }
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.ASSIGNED - 1] != who) continue;
    if (rows[i][COL.OFERTA - 1] != "YES") {
      txt += "📧 Wyślij ofertę: <b>" + rows[i][COL.NAME - 1] + "</b>\n"; count++;
    }
  }
  if (count == 0) txt += "✅ Brak aktywnych zadań!";

  const props = PropertiesService.getScriptProperties();
  const taskKey = "tasks_" + chat;
  const taskButtons = [];
  try {
    const raw = props.getProperty(taskKey);
    if (raw) {
      const tasks = JSON.parse(raw);
      if (tasks.length > 0) {
        txt += "\n\n📌 <b>Zadania:</b>\n";
        tasks.forEach((t, i) => {
          txt += (i + 1) + ". " + t.text + " <i>(od " + t.from + ", " + t.date + ")</i>\n";
          taskButtons.push([
            { text: "✅ Zrobione: " + (t.text.length > 20 ? t.text.substring(0, 20) + "..." : t.text), callback_data: "taskdone_" + i }
          ]);
        });
      }
    }
  } catch (e) { }

  if (taskButtons.length > 0) {
    sendDM(chat, txt, { inline_keyboard: taskButtons });
  } else {
    sendDM(chat, txt);
  }
}

// ─── Pinned Dashboard ────────────────────────────────────────────────────────

function updateDashboard() {
  const props = PropertiesService.getScriptProperties();
  const dashId = props.getProperty("dashboard_msg_id");
  const fsh = sheetFinanse(); const fRows = fsh.getDataRange().getValues();
  let totalRev = 0, totalCosts = 0, totalTips = 0, totalNet = 0, evCnt = 0, monthRev = 0;
  const now = new Date(); const thisM = now.getMonth(); const thisY = now.getFullYear();
  const teamStats = {};

  for (let i = 1; i < fRows.length; i++) {
    const rev = parseFloat(fRows[i][FCOL.REVENUE - 1]) || 0;
    const c = (parseFloat(fRows[i][FCOL.COSTS_ALCOHOL - 1]) || 0) + (parseFloat(fRows[i][FCOL.COSTS_TRANSPORT - 1]) || 0) +
      (parseFloat(fRows[i][FCOL.COSTS_STAFF - 1]) || 0) + (parseFloat(fRows[i][FCOL.COSTS_OTHER - 1]) || 0);
    totalRev += rev; totalCosts += c;
    totalTips += parseFloat(fRows[i][FCOL.TIPS - 1]) || 0;
    totalNet += parseFloat(fRows[i][FCOL.NET - 1]) || 0; evCnt++;
    const who = fRows[i][FCOL.ASSIGNED - 1] || "";
    if (who) teamStats[who] = (teamStats[who] || 0) + 1;
    const d = parseDate(fRows[i][FCOL.DATE - 1]);
    if (!isNaN(d.getTime()) && d.getMonth() == thisM && d.getFullYear() == thisY) monthRev += rev;
  }

  const avg = evCnt > 0 ? Math.round(totalRev / evCnt) : 0;
  let nextEv = "";
  const sh = sheetLidy(); const rows = sh.getDataRange().getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0); let closest = Infinity; let pipeline = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.UMOWA - 1] != "YES") continue;
    const d = parseDate(rows[i][COL.DATE - 1]); if (isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0); const diff = d - today;
    if (diff >= 0) {
      pipeline++;
      if (diff < closest) {
        closest = diff;
        nextEv = formatDate(rows[i][COL.DATE - 1]) + " " + rows[i][COL.CITY - 1] +
          (rows[i][COL.PACKAGE - 1] ? " (" + rows[i][COL.PACKAGE - 1] + ")" : "");
      }
    }
  }

  const teamLine = Object.entries(teamStats).map(([k, v]) => k + ": " + v).join(" / ");
  const txt =
    "📊 <b>" + CONFIG.BRAND + " " + thisY + "</b>\n\n" +
    "💵 Obrót:        <b>" + totalRev + " zł</b>\n" +
    "📉 Koszty:       <b>" + totalCosts + " zł</b>\n" +
    "💰 Napiwki:      <b>" + totalTips + " zł</b>\n" +
    "📊 Zysk netto:   <b>" + totalNet + " zł</b>\n───────────────\n" +
    "📋 Wydarzenia:   <b>" + evCnt + "</b>" + (teamLine ? " (" + teamLine + ")" : "") + "\n" +
    "💳 Śr. rachunek: <b>" + avg + " zł</b>\n" +
    "📅 Ten miesiąc:  <b>" + monthRev + " zł</b>\n" +
    "📝 Pipeline:     <b>" + pipeline + "</b>\n" +
    (nextEv ? "\n▶️ Następne: " + nextEv : "");

  if (dashId) {
    try { edit(CONFIG.GROUP_CHAT_ID, parseInt(dashId), txt); return; } catch (e) { }
  }
  const newId = send(CONFIG.GROUP_CHAT_ID, txt);
  if (newId) { props.setProperty("dashboard_msg_id", newId.toString()); pinMsg(CONFIG.GROUP_CHAT_ID, newId); }
}

// ─── Disabled daily noise ────────────────────────────────────────────────────

function morningBriefing() {
  return;
}

// ─── Google Calendar ─────────────────────────────────────────────────────────

function getBarowoCalendar() {
  const cals = CalendarApp.getCalendarsByName(CONFIG.CALENDAR_NAME);
  if (cals.length > 0) return cals[0];
  // НЕ используем default — возвращаем ошибку
  throw new Error("Kalendarz '" + CONFIG.CALENDAR_NAME + "' nie znaleziony. Utwórz go w Google Calendar.");
}

function addToCalendar(lead) {
  try {
    const name = lead[COL.NAME - 1] || ""; const event = lead[COL.EVENT - 1] || "";
    const city = lead[COL.CITY - 1] || ""; const note = lead[COL.NOTE - 1] || "";
    const hours = lead[COL.HOURS - 1] || "";
    const date = parseDate(lead[COL.DATE - 1]);
    if (isNaN(date.getTime())) return { ok: false, err: "Brak daty" };
    const title = [name, event, city, note].filter(Boolean).join(" · ");
    const timeRange = parseHoursRange_(hours, date);
    const ev = timeRange
      ? getBarowoCalendar().createEvent(title, timeRange.start, timeRange.end)
      : getBarowoCalendar().createAllDayEvent(title, date);
    return { ok: true, title: title, date: formatDate(date), calEventId: ev.getId() };
  } catch (e) { notifyError("addToCalendar", e); return { ok: false, err: e.toString() }; }
}

function removeFromCalendar(sh, row, rowData) {
  try {
    const calId = rowData[COL.CAL_ID - 1]; if (!calId) return;
    const ev = CalendarApp.getEventById(calId);
    if (ev) {
      ev.deleteEvent();
      Logger.log("Calendar event deleted: " + calId);
    } else {
      Logger.log("Calendar event not found: " + calId);
    }
    sh.getRange(row, COL.CAL_ID).setValue("");
  } catch (e) { Logger.log("removeFromCalendar: " + e); }
}

function sendCalendarEvents(chat) {
  try {
    const cal = getBarowoCalendar(); const now = new Date();
    const end = new Date(); end.setDate(end.getDate() + 90);
    const events = cal.getEvents(now, end);
    if (events.length == 0) { sendTemp(chat, "📅 Brak wydarzeń w 90 dni."); return; }
    let txt = "📅 <b>" + CONFIG.CALENDAR_NAME + " — 90 dni</b>\n\n";
    events.slice(0, 20).forEach(ev => { txt += "• <b>" + ev.getTitle() + "</b> — " + formatDate(ev.getStartTime()) + "\n"; });
    if (events.length > 20) txt += "<i>...i " + (events.length - 20) + " więcej</i>";
    const id = send(chat, txt);
    if (!isDM(chat)) scheduleDelete(chat, id, CONFIG.TTL_LIST);
  } catch (e) { notifyError("sendCalendarEvents", e); sendTemp(chat, "❌ Błąd kalendarza: " + e); }
}

// ─── Kontakty ────────────────────────────────────────────────────────────────

function addToKontakty(lead) {
  const sh = sheetKontakty(); if (!sh) return;
  const name = lead[COL.NAME - 1] || "";
  const phone = normalizeComparablePhone_(lead[COL.PHONE - 1]);
  const email = normalizeComparableEmail_(lead[COL.EMAIL - 1]);
  if (!name && !phone && !email) return;
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const rows = sh.getRange(2, KCOL.PHONE, lastRow - 1, 2).getValues();
    for (let i = 0; i < rows.length; i++) {
      const kPhone = normalizeComparablePhone_(rows[i][0]);
      const kEmail = normalizeComparableEmail_(rows[i][1]);
      if ((phone && kPhone && phone == kPhone) || (email && kEmail && email == kEmail)) return;
    }
  }
  sh.appendRow([name, "'" + phone, lead[COL.EMAIL - 1] || "", lead[COL.CITY - 1] || "",
    formatDate(lead[COL.DATE - 1]), lead[COL.EVENT - 1] || "", formatDate(new Date()), "cold"]);
}

function updateKontaktyStatus(lead, status) {
  const sh = sheetKontakty(); if (!sh) return;
  const name = lead[COL.NAME - 1] || "";
  const phone = normalizeComparablePhone_(lead[COL.PHONE - 1]);
  const email = normalizeComparableEmail_(lead[COL.EMAIL - 1]);
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const rows = sh.getRange(2, KCOL.NAME, lastRow - 1, KCOL.STATUS).getValues();
    for (let i = 0; i < rows.length; i++) {
      const kName = rows[i][KCOL.NAME - 1];
      const kPhone = normalizeComparablePhone_(rows[i][KCOL.PHONE - 1]);
      const kEmail = normalizeComparableEmail_(rows[i][KCOL.EMAIL - 1]);
      if ((phone && kPhone && phone == kPhone) || (email && kEmail && email == kEmail) || kName == name) {
        sh.getRange(i + 2, KCOL.STATUS).setValue(status); return;
      }
    }
  }
  addToKontakty(lead); updateKontaktyStatus(lead, status);
}

function removeFromKontakty(lead) {
  const sh = sheetKontakty(); if (!sh) return;
  const name = lead[COL.NAME - 1] || "";
  const phone = normalizeComparablePhone_(lead[COL.PHONE - 1]);
  const email = normalizeComparableEmail_(lead[COL.EMAIL - 1]);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const kPhone = normalizeComparablePhone_(rows[i][KCOL.PHONE - 1]);
    const kEmail = normalizeComparableEmail_(rows[i][KCOL.EMAIL - 1]);
    if ((phone && kPhone && phone == kPhone) || (email && kEmail && email == kEmail) || rows[i][KCOL.NAME - 1] == name) {
      sh.deleteRow(i + 1); return;
    }
  }
}

// ─── Spam ────────────────────────────────────────────────────────────────────

function moveToSpam(chat, uid, msgId, text, userId) {
  withLock(function () {
    const sh = sheetLidy(); const spamSh = sheetSpam();
    if (!spamSh) { sendTemp(chat, "❌ Nie ma arkusza 'Spam'."); return; }
    const row = findRowByUID(sh, uid);
    if (row < 0) { edit(chat, msgId, "❌ Lead nie znaleziony.", { inline_keyboard: [] }); return; }
    const rowData = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    const leadName = rowData[COL.NAME - 1];
    rowData[COL.SPAM - 1] = "YES";
    rowData[COL.LEAD_STATUS - 1] = LEGACY_LEAD_STAGE.SPAM;
    updateKontaktyStatus(rowData, "spam");
    syncLegacyLeadToModernCrm_(rowData);
    removeFromCalendar(sh, row, rowData);
    spamSh.appendRow(rowData);
    sh.deleteRow(row);
    edit(chat, msgId, "🗑 Przeniesiono do Spam.", { inline_keyboard: [] });
    scheduleDelete(chat, msgId, CONFIG.TTL_CONFIRM);
    logAction(whoIsUser(userId), "spam", leadName);
  });
}

function restoreFromSpam(chat, uid, listMsgId) {
  withLock(function () {
    const spamSh = sheetSpam(); const lidy = sheetLidy();
    if (!spamSh) { sendTemp(chat, "❌ Nie ma arkusza 'Spam'."); return; }
    // Ищем в спаме по UID
    const rows = spamSh.getDataRange().getValues();
    let spamRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][COL.UID - 1] || "").toString() === uid) { spamRow = i + 1; break; }
    }
    if (spamRow < 0) { sendTemp(chat, "❌ Lead nie znaleziony."); deleteMsg(chat, listMsgId); sendSpamList(chat); return; }
    const rowData = spamSh.getRange(spamRow, 1, 1, spamSh.getLastColumn()).getValues()[0];
    rowData[COL.SPAM - 1] = "";
    rowData[COL.LEAD_STATUS - 1] = rowData[COL.ASSIGNED - 1] ? LEGACY_LEAD_STAGE.ASSIGNED : LEGACY_LEAD_STAGE.NEW;
    lidy.appendRow(rowData);
    spamSh.deleteRow(spamRow);
    updateKontaktyStatus(rowData, "cold");
    syncLegacyLeadToModernCrm_(rowData);
    deleteMsg(chat, listMsgId);
    sendSpamList(chat);
    sendTemp(chat, "↩️ Lead przywrócony.");
    logAction(whoIsUser(chat), "restore", rowData[COL.NAME - 1]);
  });
}

function sendSpamList(chat) {
  const spamSh = sheetSpam();
  if (!spamSh) { sendTemp(chat, "❌ Nie ma arkusza 'Spam'."); return; }
  const rows = spamSh.getDataRange().getValues(); const leads = [];
  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][COL.NAME - 1]; if (!name) continue;
    const uid = (rows[i][COL.UID - 1] || "").toString();
    leads.push({ name: name, uid: uid });
  }
  if (leads.length == 0) { sendTemp(chat, "🗑 Spam jest pusty."); return; }
  const id = send(chat, "🗑 <b>Spam (" + leads.length + ")</b>\nWybierz lead do przywrócenia:", spamListKeyboard(leads));
  scheduleDelete(chat, id, CONFIG.TTL_LIST);
}

// ─── Nocall / Leads / Stats / Export / Import ────────────────────────────────

function sendNocallList(chat) {
  const rows = sheetLidy().getDataRange().getValues(); const leads = [];
  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][COL.NAME - 1]; if (!name || rows[i][COL.ASSIGNED - 1]) continue;
    const uid = getLeadUID(rows[i]);
    leads.push({ name: name, uid: uid });
  }
  if (leads.length == 0) { sendTemp(chat, "✅ Wszyscy przypisani."); return; }
  const id = send(chat, "📵 <b>Bez przypisania (" + leads.length + ")</b>", nocallListKeyboard(leads));
  scheduleDelete(chat, id, CONFIG.TTL_LIST);
}

function sendLeadsList(chat, filter, query) {
  const rows = sheetLidy().getDataRange().getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const titles = {
    all: "📋 Wszystkie",
    hot: "🔥 Bez oferty",
    nocall: "📵 Bez przypisania",
    today: "📅 Dzisiaj",
    search: "🔍 " + (query || "")
  };
  Object.values(CONFIG.TEAM).forEach(function (member) {
    titles["team_" + slugifyTeamName_(member.name)] = "👤 " + member.name;
  });
  let chunk = "<b>" + (titles[filter] || "Leady") + "</b>\n\n"; let count = 0;

  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][COL.NAME - 1]; if (!name) continue;
    const assigned = rows[i][COL.ASSIGNED - 1] || ""; const oferta = rows[i][COL.OFERTA - 1];
    if (filter == "hot" && oferta == "YES") continue;
    if (filter && filter.indexOf("team_") === 0) {
      const teamSlug = filter.replace("team_", "");
      if (slugifyTeamName_(assigned) != teamSlug) continue;
    }
    if (filter == "nocall" && assigned) continue;
    if (filter == "today") { const d = parseDate(rows[i][COL.DATE - 1]); if (isNaN(d.getTime())) continue; d.setHours(0, 0, 0, 0); if (d.getTime() != today.getTime()) continue; }
    if (filter == "search" && query) { const q = query.toLowerCase(); if (!name.toLowerCase().includes(q) && !(rows[i][COL.PHONE - 1] + "").includes(q)) continue; }

    const guests = rows[i][COL.GUESTS - 1] || "";
    const icons = (assigned ? "👤" : "·") + (oferta == "YES" ? "📧" : "·") + (rows[i][COL.UMOWA - 1] == "YES" ? "📝" : "·");
    const entry = icons + " <b>" + name + "</b>" + (guests ? " · 👥 " + guests : "") +
      "\n📞 " + (rows[i][COL.PHONE - 1] || "") + "\n📍 " + (rows[i][COL.CITY - 1] || "") + " | 📅 " + formatDate(rows[i][COL.DATE - 1]) + "\n\n";
    if ((chunk + entry).length > 3800) { const id = send(chat, chunk); if (!isDM(chat)) scheduleDelete(chat, id, CONFIG.TTL_LIST); chunk = ""; }
    chunk += entry; count++;
  }
  if (count == 0) { sendTemp(chat, (titles[filter] || "Leady") + "\n\n<i>Brak wyników.</i>"); return; }
  if (chunk.trim()) { const id = send(chat, chunk); if (!isDM(chat)) scheduleDelete(chat, id, CONFIG.TTL_LIST); }
}

function sendStats(chat) {
  const rows = sheetLidy().getDataRange().getValues();
  let total = 0, assigned = 0, ofertas = 0, umowy = 0;
  const teamCounts = {};
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][COL.NAME - 1]) continue; total++;
    if (rows[i][COL.ASSIGNED - 1]) { assigned++; const w = rows[i][COL.ASSIGNED - 1]; teamCounts[w] = (teamCounts[w] || 0) + 1; }
    if (rows[i][COL.OFERTA - 1] == "YES") ofertas++;
    if (rows[i][COL.UMOWA - 1] == "YES") umowy++;
  }
  let spams = 0; const spamSh = sheetSpam(); if (spamSh) spams = Math.max(0, spamSh.getLastRow() - 1);
  const conv = total > 0 ? Math.round(umowy / total * 100) : 0;
  const teamLine = Object.entries(teamCounts).map(([k, v]) => k + ": " + v).join("  ");
  const id = send(chat,
    "📊 <b>Statystyki</b>\n\n👥 Leadów: <b>" + total + "</b>\n👤 Przypisano: <b>" + assigned + "</b>\n" +
    (teamLine ? "   └ " + teamLine + "\n" : "") +
    "📧 Ofert: <b>" + ofertas + "</b>\n" +
    "📝 Umów: <b>" + umowy + "</b>\n📈 Konwersja: <b>" + conv + "%</b>\n🗑 Spam: <b>" + spams + "</b>");
  scheduleDelete(chat, id, CONFIG.TTL_LIST);
}

function exportCSV(chat) {
  const rows = sheetLidy().getDataRange().getValues();
  let csv = "Imię,Telefon,Email,Miasto,Data,Wydarzenie,Przypisano,Oferta,Umowa,Notatka,Historia\n";
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][COL.NAME - 1]) continue;
    const e = v => '"' + (v + "").replace(/"/g, '""') + '"';
    csv += e(rows[i][COL.NAME - 1]) + "," + e(rows[i][COL.PHONE - 1]) + "," + e(rows[i][COL.EMAIL - 1]) + "," +
      e(rows[i][COL.CITY - 1]) + "," + e(formatDate(rows[i][COL.DATE - 1])) + "," + e(rows[i][COL.EVENT - 1]) + "," +
      e(rows[i][COL.ASSIGNED - 1]) + "," + e(rows[i][COL.OFERTA - 1]) + "," + e(rows[i][COL.UMOWA - 1]) + "," +
      e(rows[i][COL.NOTE - 1]) + "," + e(rows[i][COL.CALLHIST - 1]) + "\n";
  }
  try {
    const csvBlob = Utilities.newBlob(csv, MimeType.CSV, "Lidy_" + formatDate(new Date()) + ".csv");
    sendDocument(chat, csvBlob, "📥 <b>Export leadów</b>");
  } catch (e) { notifyError("exportCSV", e); sendTemp(chat, "❌ Błąd: " + e); }
}

function importLeads(chat, text) {
  withLock(function () {
    const lines = text.trim().split("\n"); const sh = sheetLidy(); let ok = 0, fail = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line) continue;
      const p = line.split(","); if (p.length < 6) { fail++; continue; }
      const fields = {
        name: p[0].trim(),
        phone: p[1].trim(),
        email: p[2].trim(),
        city: p[3].trim(),
        date: p[4].trim(),
        event: p[5].trim()
      };
      if (findDuplicateLegacyLeadRow_(sh, fields.name, fields.phone, fields.email) > 0) { fail++; continue; }
      const newRow = buildManualLegacyLeadRow_(fields, "import", "");
      sh.getRange(sh.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);
      addToKontakty(newRow);
      syncLegacyLeadToModernCrm_(newRow);
      ok++;
    }
    const id = send(chat, "📥 <b>Import:</b> ✅ " + ok + (fail > 0 ? " ❌ " + fail : ""));
    if (!isDM(chat)) scheduleDelete(chat, id, CONFIG.TTL_LIST);
    logAction(whoIsUser(chat), "import", "", ok + " leadów");
  });
}

function createEmailDraft(chat, uid, pkg, msgId, originalText) {
  withLock(function () {
    const sh = sheetLidy();
    const leadRef = getLeadRowDataByUid_(sh, uid);
    if (!leadRef) { sendTemp(chat, "❌ Lead nie znaleziony."); return; }
    const row = leadRef.rowNumber;
    const lead = leadRef.rowData;
    const name = lead[COL.NAME - 1] || ""; const email = lead[COL.EMAIL - 1] || "";
    const date = formatDate(lead[COL.DATE - 1]); const event = lead[COL.EVENT - 1] || "";
    if (!email) {
      edit(chat, msgId, baseLeadText(originalText) + statusLineFromRow(lead) + "\n\n❌ Brak emaila!",
        leadKeyboard_(uid, lead)); return;
    }
    let pdfBlob;
    try { pdfBlob = DriveApp.getFileById(CONFIG.PDF_FILE_ID).getBlob().setName("Oferta_" + CONFIG.BRAND + ".pdf"); }
    catch (e) {
      notifyError("createEmailDraft PDF", e);
      edit(chat, msgId, baseLeadText(originalText) + statusLineFromRow(lead),
        leadKeyboard_(uid, lead));
      sendTemp(chat, "❌ Nie można znaleźć PDF."); return;
    }

    const pkgNames = { simple: "Simple", standard: "Standard", premium: "Premium" };
    const pkgName = pkgNames[pkg] || pkg;
    const who = whoIsUser(chat) || Object.values(CONFIG.TEAM)[0].name;
    const subject = "Oferta " + CONFIG.BRAND + " — " + event + " " + date;
    const body = "Dzień dobry" + (name ? " " + name : "") + ",\n\n" +
      "zgodnie z naszą rozmową przesyłam w załączniku naszą ofertę.\n" +
      "Najbardziej odpowiednim pakietem będzie pakiet " + pkgName + ".\n" +
      "Możemy przygotować kompletny mobilny bar — przyjeżdżamy z całym zapleczem " +
      "i zajmujemy się obsługą od początku do końca.\n\n" +
      "Potrzebujemy jeszcze kilku informacji:\n" +
      "1. Gdzie dokładnie odbędzie się impreza (nazwa i lokalizacja)\n" +
      "2. W jakich godzinach planowana jest impreza\n\n" +
      "Tak jak omówiliśmy, zadzwonię jeszcze dzisiaj.\n\n" + who + " " + CONFIG.BRAND + "\nPozdrawiam serdecznie";

    try {
      GmailApp.createDraft(email, subject, body, { attachments: [pdfBlob] });
      sh.getRange(row, COL.LEAD_STATUS).setValue(LEGACY_LEAD_STAGE.OFFER_DRAFT);
      const updatedLead = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
      syncLegacyLeadToModernCrm_(updatedLead);
      edit(chat, msgId, baseLeadText(originalText) + statusLineFromRow(updatedLead), leadKeyboard_(uid, updatedLead));
      const id = send(chat, "✉️ <b>Szkic gotowy!</b>\nDo: <b>" + email + "</b> · <b>" + pkgName + "</b>");
      scheduleDelete(chat, id, CONFIG.TTL_CONFIRM);
      logAction(who, "email_draft", name, pkgName);
    } catch (e) {
      notifyError("createEmailDraft", e);
      edit(chat, msgId, baseLeadText(originalText) + statusLineFromRow(lead),
        leadKeyboard_(uid, lead));
      sendTemp(chat, "❌ Błąd: " + e);
    }
  });
}

function appendCallHistory(sh, row, who) {
  const current = sh.getRange(row, COL.CALLHIST).getValue() || "";
  const entry = who + " " + formatDate(new Date());
  sh.getRange(row, COL.CALLHIST).setValue(current ? current + ", " + entry : entry);
}

// ─── Auto triggers ───────────────────────────────────────────────────────────

function checkNewLeads() {
  const sh = sheetLidy(); const rows = sh.getDataRange().getValues(); const now = new Date().getTime();
  for (let i = 1; i < rows.length; i++) {
    const phone = rows[i][COL.PHONE - 1]; if (!phone) continue;
    const sentVal = (rows[i][COL.SENT - 1] + "");

    // Если нет UID — сгенерировать
    if (!rows[i][COL.UID - 1]) {
      const uid = generateUID();
      sh.getRange(i + 1, COL.UID).setValue(uid);
      rows[i][COL.UID - 1] = uid;
    }

    if (!sentVal || sentVal == "") {
      try {
        const uid = rows[i][COL.UID - 1].toString();
        if (!rows[i][COL.LEAD_STATUS - 1]) {
          rows[i][COL.LEAD_STATUS - 1] = inferLegacyLeadStage_(rows[i]);
          sh.getRange(i + 1, COL.LEAD_STATUS).setValue(rows[i][COL.LEAD_STATUS - 1]);
        }
        send(CONFIG.GROUP_CHAT_ID, buildLeadText(rows[i]) + statusLineFromRow(rows[i]), keyboard(uid, false));
        // Уведомления всей команде
        for (const [id, m] of Object.entries(CONFIG.TEAM)) {
          send(id, "🔔 Nowy lead! Sprawdź grupę.");
        }
        addToKontakty(rows[i]);
        sh.getRange(i + 1, COL.SENT).setValue("SENT_" + now);
        const syncedLead = sh.getRange(i + 1, 1, 1, sh.getLastColumn()).getValues()[0];
        syncLegacyLeadToModernCrm_(syncedLead);
      } catch (e) { notifyError("checkNewLeads " + (i + 1), e); }
      continue;
    }
    if (sentVal.startsWith("SENT_") && !rows[i][COL.ASSIGNED - 1]) {
      const sentTime = parseInt(sentVal.replace("SENT_", ""));
      if (now - sentTime > 7 * 60 * 60 * 1000) {
        send(CONFIG.GROUP_CHAT_ID, "⚠️ <b>Brak przypisania 7h!</b>\n\n👤 <b>" + rows[i][COL.NAME - 1] + "</b>\n📞 " + phone);
        sh.getRange(i + 1, COL.SENT).setValue("ALERTED");
      }
    }
  }
}

function reminders() {
  const sh = sheetLidy(); const rows = sh.getDataRange().getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0); const todayStr = formatDate(today);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.UMOWA - 1] == "YES") {
      const date = parseDate(rows[i][COL.DATE - 1]);
      if (!isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0); const diff = (date - today) / 86400000;
        let flags = (rows[i][COL.REMIND - 1] || "").toString(); let upd = false;
        if (diff <= 30 && diff > 29 && !flags.includes("30")) { send(CONFIG.GROUP_CHAT_ID, "⏰ Za miesiąc: <b>" + rows[i][COL.NAME - 1] + "</b> · " + formatDate(rows[i][COL.DATE - 1])); flags += "30,"; upd = true; }
        if (diff <= 7 && diff > 6 && !flags.includes("7")) { send(CONFIG.GROUP_CHAT_ID, "⏰ Za tydzień: <b>" + rows[i][COL.NAME - 1] + "</b> · " + formatDate(rows[i][COL.DATE - 1])); flags += "7,"; upd = true; }
        if (diff <= 1 && diff > 0 && !flags.includes("1")) { send(CONFIG.GROUP_CHAT_ID, "⏰ Jutro: <b>" + rows[i][COL.NAME - 1] + "</b> · " + formatDate(rows[i][COL.DATE - 1])); flags += "1,"; upd = true; }
        if (upd) sh.getRange(i + 1, COL.REMIND).setValue(flags);
      }
    }
    const nc = rows[i][COL.NEXTCALL - 1];
    if (nc) {
      const ncStr = nc.toString().trim();
      const datePart = ncStr.split(" ")[0];
      const nd = parseDate(datePart); if (!isNaN(nd.getTime())) {
        nd.setHours(0, 0, 0, 0);
        const flags = (rows[i][COL.REMIND - 1] || "").toString(); const ncFlag = "nc_" + todayStr;
        if (nd.getTime() == today.getTime() && !flags.includes(ncFlag)) {
          const timePart = ncStr.split(" ")[1] || "";
          send(CONFIG.GROUP_CHAT_ID, "🔔 <b>Zadzwoń!</b> " + rows[i][COL.NAME - 1] + " · 📞 " + rows[i][COL.PHONE - 1] +
            (timePart ? " · 🕐 " + timePart : ""));
          sh.getRange(i + 1, COL.REMIND).setValue(flags + ncFlag + ",");
          sh.getRange(i + 1, COL.NEXTCALL).setValue("");
        }
      }
    }
  }
}

function dailySummary() {
  return;
}

function monthlyContactsExport() {
  const sh = sheetKontakty();
  if (!sh) { notifyError("monthlyContactsExport", "Brak Kontakty"); return; }
  const rows = sh.getDataRange().getValues();
  let csv = "Imię,Telefon,Email,Miasto,Data,Wydarzenie,Status,Dodano\n"; let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const email = rows[i][KCOL.EMAIL - 1]; const status = rows[i][KCOL.STATUS - 1];
    if (!email || status == "signed") continue;
    const e = v => '"' + (v + "").replace(/"/g, '""') + '"';
    csv += e(rows[i][KCOL.NAME - 1]) + "," + e(rows[i][KCOL.PHONE - 1]) + "," + e(email) + "," +
      e(rows[i][KCOL.CITY - 1]) + "," + e(rows[i][COL.DATE - 1]) + "," + e(rows[i][KCOL.EVENT - 1]) + "," +
      e(status) + "," + e(rows[i][KCOL.ADDED - 1]) + "\n"; count++;
  }
  if (count == 0) { send(CONFIG.GROUP_CHAT_ID, "📧 Eksport: brak kontaktów."); return; }
  try {
    const csvBlob = Utilities.newBlob(csv, MimeType.CSV, "Kontakty_" + formatDate(new Date()) + ".csv");
    sendDocument(CONFIG.GROUP_CHAT_ID, csvBlob, "📧 <b>Eksport kontaktów</b> · " + count + " kontaktów");
  } catch (e) { notifyError("monthlyContactsExport", e); }
}

// ─── Archiwum (admin only) ───────────────────────────────────────────────────

function importArchiwum(chat, text) {
  withLock(function () {
    const lines = text.trim().split("\n");
    const sh = sheetLidy();
    const fsh = sheetFinanse();
    const props = PropertiesService.getScriptProperties();
    const today = new Date(); today.setHours(23, 59, 59, 999);
    let ok = 0, fail = 0, settled = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line) continue;
      const p = line.split(",");
      if (p.length < 5) { fail++; continue; }

      const name = p[0].trim();
      const city = p[1].trim();
      const date = p[2].trim();
      const pkg = p[3].trim();
      const price = parseInt(p[4].trim());
      if (!name || !date || isNaN(price)) { fail++; continue; }

      const uid = generateUID();
      const newRow = new Array(COL.CLIENT_ADDRESS).fill("");
      newRow[COL.UID - 1] = uid;
      newRow[COL.CREATED_AT - 1] = new Date().toISOString();
      newRow[COL.NAME - 1] = name;
      newRow[COL.CITY - 1] = city;
      newRow[COL.DATE - 1] = date;
      newRow[COL.EVENT - 1] = "";
      newRow[COL.LEAD_SOURCE - 1] = "archiwum";
      newRow[COL.LEAD_STATUS - 1] = LEGACY_LEAD_STAGE.SIGNED;
      newRow[COL.ASSIGNED - 1] = whoIsUser(chat) || "";
      newRow[COL.OFERTA - 1] = "YES";
      newRow[COL.UMOWA - 1] = "YES";
      newRow[COL.PACKAGE - 1] = pkg;
      newRow[COL.CLIENT_FULL_NAME - 1] = name;
      newRow[COL.SENT - 1] = "ARCHIWUM";
      sh.getRange(sh.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);

      addToKontakty(newRow);
      updateKontaktyStatus(newRow, "signed");
      syncLegacyLeadToModernCrm_(newRow);

      const eventDate = parseDate(date);
      if (!isNaN(eventDate.getTime()) && eventDate <= today) {
        fsh.appendRow([date, name, "", pkg, price, 0, 0, 0, 0, 0, price, whoIsUser(chat) || ""]);
        settled++;
      }

      let cnt = parseInt(props.getProperty("umowa_counter") || "0");
      cnt++;
      props.setProperty("umowa_counter", cnt.toString());

      ok++;
    }

    let msg = "📦 <b>Archiwum — import</b>\n" +
      "✅ Dodano: <b>" + ok + "</b>";
    if (settled > 0) msg += "\n💰 Rozliczonych (przeszłe): <b>" + settled + "</b>";
    if (ok - settled > 0) msg += "\n📅 Przyszłe (bez rozliczenia): <b>" + (ok - settled) + "</b>";
    if (fail > 0) msg += "\n❌ Błędów: <b>" + fail + "</b>";
    sendDM(chat, msg);

    if (ok > 0) updateDashboard();
    logAction(whoIsUser(chat), "archiwum_import", "", ok + " leadów");
  });
}

// ─── Triggers ────────────────────────────────────────────────────────────────

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("checkNewLeads").timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger("cleanupMessages").timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger("monitorLeadFlowHealth").timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger("reminders").timeBased().everyHours(1).create();
}
