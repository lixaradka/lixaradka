// ─── МИГРАЦИЯ ЛИДОВ ИЗ СТАРОЙ ТАБЛИЦЫ ───────────────────────────────────────
// Запускается ОДИН раз вручную из Apps Script редактора.
// НЕ отправляет уведомления в Telegram.
// ─────────────────────────────────────────────────────────────────────────────

var MIGRATION_SOURCE_SPREADSHEET_ID = "1Px3FhzmVJ_zz8hS-vk6Ork4l1FU-L1YOgfqLXmXinpc";

// Имя листа в старой таблице — попробует оба варианта
var MIGRATION_SOURCE_SHEET_NAMES = ["Lidy", "лиды", "Leads", "Лиды"];

// Колонки старой таблицы (1-based, по LegacySheetFormat.gs):
// A=1=id  B=2=created_time  G=7=campaign_id  H=8=campaign_name
// L=12=platform  M=13=Rodzaj  N=14=Ilość os.  O=15=Data  P=16=Miasto
// Q=17=Imię  R=18=Email  S=19=Telefon  U=21=lead_status  W=23=Przypisano
// AC=29=Notatka

function migrateLeadsFromOldSheet() {
  var sourceSheet = getMigrationSourceSheet_();
  if (!sourceSheet) {
    Logger.log("❌ Лист не найден. Проверь MIGRATION_SOURCE_SHEET_NAMES.");
    return;
  }

  var lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("⚠️ Лист пустой или только заголовок.");
    return;
  }

  var lastCol = sourceSheet.getLastColumn();
  var allRows = sourceSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var imported = 0;
  var skipped = 0;

  allRows.forEach(function (row) {
    var clientName = (row[16] || "").toString().trim(); // Q=17 → index 16
    var phone      = (row[18] || "").toString().trim(); // S=19 → index 18

    // Пропускаем пустые строки
    if (!clientName && !phone) {
      skipped++;
      return;
    }

    var legacyUid   = (row[0]  || "").toString().trim(); // A=1
    var createdAt   = row[1] ? formatMigrationDate_(row[1]) : new Date().toISOString(); // B=2
    var platform    = (row[11] || "").toString().trim(); // L=12
    var eventType   = (row[12] || "").toString().trim(); // M=13
    var guests      = (row[13] || "").toString().trim(); // N=14
    var eventDate   = row[14] ? formatMigrationDate_(row[14]) : ""; // O=15
    var city        = (row[15] || "").toString().trim(); // P=16
    var email       = (row[17] || "").toString().trim(); // R=18
    var leadStatus  = (row[20] || "").toString().trim(); // U=21 → index 20
    var managerName = (row[22] || "").toString().trim(); // W=23 → index 22
    var note        = (row[28] || "").toString().trim(); // AC=29 → index 28
    var campaignName = (row[7] || "").toString().trim(); // H=8 → index 7

    var lead = {
      lead_id:       generateLeadId_(),
      legacy_uid:    legacyUid,
      created_at:    createdAt,
      source:        platform || "legacy_import",
      status:        leadStatus || "imported",
      client_name:   clientName,
      phone:         phone,
      email:         email,
      event_type:    eventType,
      event_date:    eventDate,
      city:          city,
      guests:        guests,
      package_name:  "",
      message:       note,
      manager_name:  managerName,
      utm_source:    "",
      utm_medium:    "",
      utm_campaign:  campaignName,
      utm_content:   "",
      utm_term:      "",
      page_url:      "",
      referrer:      "",
      consent:       "yes",
      raw_payload:   JSON.stringify(row)
    };

    // Пишем напрямую — БЕЗ вызова sendTelegramLeadNotification_
    appendRecordToSheet_(BAROWO_SHEET_SCHEMAS.leads, lead);
    upsertContactFromLead_(lead);
    imported++;
  });

  appendLog_("info", "migration", "legacy leads imported", {
    imported: imported,
    skipped: skipped,
    source: MIGRATION_SOURCE_SPREADSHEET_ID
  });

  Logger.log("✅ Готово! Импортировано: " + imported + ", пропущено: " + skipped);
}

function getMigrationSourceSheet_() {
  var ss = SpreadsheetApp.openById(MIGRATION_SOURCE_SPREADSHEET_ID);
  for (var i = 0; i < MIGRATION_SOURCE_SHEET_NAMES.length; i++) {
    var sheet = ss.getSheetByName(MIGRATION_SOURCE_SHEET_NAMES[i]);
    if (sheet) return sheet;
  }
  return null;
}

function formatMigrationDate_(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  var d = new Date(value);
  return isNaN(d.getTime()) ? value.toString() : d.toISOString();
}
