// ─── FORMAT SHEETS v4 (FINAL) ────────────────────────────────────────────────
// Точные колонки по скриншотам. Без угадывания.
//
// LIDY колонки:
//   A=id  B=created_time  C=ad_id  D=ad_name  E=adset_id  F=adset_name
//   G=campaign_id  H=campaign_name  I=form_id  J=form_name  K=is_organic
//   L=platform  M=Rodzaj  N=Ilość os.  O=Data  P=Miasto  Q=Imię
//   R=Email  S=Telefon  U=lead_status  V=статус тг  W=Przypisano
//   X=Oferta  Y=Umowa  Z=?  AA=?  AB=REMIND  AC=Notatka  AD=Historia
//   AE=NEXTCALL  AF=CAL_ID  AG=package?  AH=?  AI=?
//
// ПОКАЗАТЬ: M, N, O, P, Q, R, S, W, X, Y, AC, AD
// СКРЫТЬ: всё остальное
// ─────────────────────────────────────────────────────────────────────────────

function formatAllSheets() {
  formatLidy();
  formatFinanse();
  formatSpam();
  // Kontakty уже выглядит хорошо, только чистим дубликаты
  cleanKontakty();
  Logger.log("✅ Готово!");
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЛИСТ LIDY
// ═══════════════════════════════════════════════════════════════════════════════

function formatLidy() {
  var sh = getBarowoSpreadsheet_().getSheetByName("Lidy");
  if (!sh) return;

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();

  // ─── 1. Показать все колонки (сброс) ───
  try { sh.showColumns(1, lastCol); } catch(e) {}

  // ─── 2. Убрать ВСЕ цвета и форматирование ───
  sh.getRange(1, 1, lastRow + 50, lastCol).setBackground(null)
    .setFontColor("#000000").setFontWeight("normal").setFontSize(10);

  // ─── 3. Переименовать заголовки ───
  var renames = {
    13: "Rodzaj",       // M
    14: "Ilość os.",    // N
    15: "Data",         // O
    16: "Miasto",       // P
    17: "Imię",         // Q
    18: "Email",        // R
    19: "Telefon",      // S
    23: "Przypisano",   // W
    24: "Oferta",       // X
    25: "Umowa",        // Y
    29: "Notatka",      // AC
    30: "Historia"      // AD
  };
  for (var col in renames) {
    sh.getRange(1, parseInt(col)).setValue(renames[col]);
  }

  // ─── 4. ПОКАЗАТЬ только нужные колонки ───
  // M=13, N=14, O=15, P=16, Q=17, R=18, S=19, W=23, X=24, Y=25, AC=29, AD=30
  var showColumns = [13, 14, 15, 16, 17, 18, 19, 23, 24, 25, 29, 30];

  // Скрыть ВСЕ
  for (var c = 1; c <= lastCol; c++) {
    var shouldShow = false;
    for (var s = 0; s < showColumns.length; s++) {
      if (showColumns[s] === c) { shouldShow = true; break; }
    }
    if (!shouldShow) {
      try { sh.hideColumns(c); } catch(e) {}
    }
  }

  // ─── 5. Ширина видимых колонок ───
  var widths = {
    13: 95,    // Rodzaj
    14: 75,    // Ilość os.
    15: 100,   // Data
    16: 130,   // Miasto
    17: 175,   // Imię
    18: 215,   // Email
    19: 145,   // Telefon
    23: 100,   // Przypisano
    24: 60,    // Oferta
    25: 60,    // Umowa
    29: 290,   // Notatka
    30: 230    // Historia
  };
  for (var col2 in widths) {
    sh.setColumnWidth(parseInt(col2), widths[col2]);
  }

  // ─── 6. Заголовки ───
  sh.getRange(1, 1, 1, lastCol).setBackground("#1B2A4A").setFontColor("#FFFFFF")
    .setFontWeight("bold").setFontSize(10).setVerticalAlignment("middle")
    .setHorizontalAlignment("center").setWrap(false);
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);

  // ─── 7. Удалить пустые строки ───
  for (var r = lastRow; r >= 2; r--) {
    var name = sh.getRange(r, 17).getValue();  // Q = Imię
    var phone = sh.getRange(r, 19).getValue(); // S = Telefon
    if (!name && !phone) sh.deleteRow(r);
  }

  // ─── 8. Чередование строк ───
  var finalLast = sh.getLastRow();
  for (var r2 = 2; r2 <= finalLast; r2++) {
    sh.getRange(r2, 1, 1, lastCol).setBackground(r2 % 2 === 0 ? "#F8F9FA" : "#FFFFFF");
  }

  // ─── 9. Условное форматирование ───
  sh.clearConditionalFormatRules();
  if (finalLast > 1) {
    var dataRange = sh.getRange(2, 1, finalLast - 1, lastCol);
    sh.setConditionalFormatRules([
      // Umowa YES → зелёная строка
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$Y2="YES"')
        .setBackground("#D5F5E3")
        .setRanges([dataRange]).build(),
      // Без назначения → жёлтая строка
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($W2="",$Q2<>"")')
        .setBackground("#FEF9E7")
        .setRanges([dataRange]).build()
    ]);
  }

  // ─── 10. Бордюры ───
  sh.getRange(1, 1, finalLast, lastCol).setBorder(
    true, true, true, true, true, true, "#E0E0E0", SpreadsheetApp.BorderStyle.SOLID);

  // ─── 11. Данные ───
  if (finalLast > 1) {
    sh.getRange(2, 1, finalLast - 1, lastCol).setVerticalAlignment("middle").setWrap(false);
  }

  Logger.log("✅ Lidy: " + (finalLast - 1) + " лидов, " + showColumns.length + " видимых колонок");
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЛИСТ SPAM — та же структура что и Lidy, те же колонки
// ═══════════════════════════════════════════════════════════════════════════════

function formatSpam() {
  var sh = getBarowoSpreadsheet_().getSheetByName("Spam");
  if (!sh) return;

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2) { Logger.log("Spam пуст"); return; }

  try { sh.showColumns(1, lastCol); } catch(e) {}
  sh.getRange(1, 1, lastRow + 20, lastCol).setBackground(null)
    .setFontColor("#000000").setFontWeight("normal").setFontSize(10);

  // Те же колонки что и в Lidy (структура идентичная)
  var showColumns = [13, 14, 15, 16, 17, 18, 19, 23, 24, 25, 29, 30];
  var renames = {
    13: "Rodzaj", 14: "Ilość os.", 15: "Data", 16: "Miasto",
    17: "Imię", 18: "Email", 19: "Telefon", 23: "Przypisano",
    24: "Oferta", 25: "Umowa", 29: "Notatka", 30: "Historia"
  };

  // Переименовать (если колонки существуют)
  for (var col in renames) {
    var c = parseInt(col);
    if (c <= lastCol) sh.getRange(1, c).setValue(renames[col]);
  }

  // Скрыть всё кроме нужного
  for (var c2 = 1; c2 <= lastCol; c2++) {
    var show = false;
    for (var s = 0; s < showColumns.length; s++) {
      if (showColumns[s] === c2) { show = true; break; }
    }
    if (!show) { try { sh.hideColumns(c2); } catch(e) {} }
  }

  // Ширина
  var widths = {
    13: 95, 14: 75, 15: 100, 16: 130, 17: 175, 18: 215,
    19: 145, 23: 100, 24: 60, 25: 60, 29: 290, 30: 230
  };
  for (var col2 in widths) {
    var c3 = parseInt(col2);
    if (c3 <= lastCol) sh.setColumnWidth(c3, widths[col2]);
  }

  // Тёмно-красные заголовки
  sh.getRange(1, 1, 1, lastCol).setBackground("#922B21").setFontColor("#FFFFFF")
    .setFontWeight("bold").setFontSize(10).setVerticalAlignment("middle")
    .setHorizontalAlignment("center").setWrap(false);
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);

  // Чередование — розоватое
  for (var r = 2; r <= lastRow; r++) {
    sh.getRange(r, 1, 1, lastCol).setBackground(r % 2 === 0 ? "#FDF2F2" : "#FFFFFF");
  }

  sh.getRange(1, 1, lastRow, lastCol).setBorder(
    true, true, true, true, true, true, "#E0E0E0", SpreadsheetApp.BorderStyle.SOLID);

  Logger.log("✅ Spam: " + (lastRow - 1) + " записей");
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЛИСТ FINANSE
// ═══════════════════════════════════════════════════════════════════════════════

function formatFinanse() {
  var sh = getBarowoSpreadsheet_().getSheetByName("Finanse");
  if (!sh) return;
  var lastRow = Math.max(sh.getLastRow(), 1);
  var lastCol = Math.max(sh.getLastColumn(), 1);

  sh.getRange(1, 1, lastRow, lastCol).setBackground(null).setFontColor("#000000");

  sh.getRange(1, 1, 1, lastCol).setBackground("#1B2A4A").setFontColor("#FFFFFF")
    .setFontWeight("bold").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center");
  sh.setRowHeight(1, 34);
  sh.setFrozenRows(1);

  var widths = [100, 160, 120, 100, 100, 90, 90, 90, 80, 80, 110, 100];
  for (var i = 0; i < widths.length && i < lastCol; i++) sh.setColumnWidth(i + 1, widths[i]);

  for (var r = 2; r <= lastRow; r++) {
    sh.getRange(r, 1, 1, lastCol).setBackground(r % 2 === 0 ? "#F8F9FA" : "#FFFFFF");
  }

  if (lastRow > 1) {
    for (var c = 5; c <= 11 && c <= lastCol; c++) {
      sh.getRange(2, c, lastRow - 1, 1).setNumberFormat('#,##0 "zł"');
    }
  }

  sh.clearConditionalFormatRules();
  if (lastCol >= 11 && lastRow > 1) {
    var netR = sh.getRange(2, 11, lastRow - 1, 1);
    sh.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThan(0).setFontColor("#27AE60").setBold(true).setRanges([netR]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThan(0).setFontColor("#E74C3C").setBold(true).setRanges([netR]).build()
    ]);
  }

  sh.getRange(1, 1, lastRow, lastCol).setBorder(
    true, true, true, true, true, true, "#E0E0E0", SpreadsheetApp.BorderStyle.SOLID);
  Logger.log("✅ Finanse отформатирован");
}

// ═══════════════════════════════════════════════════════════════════════════════
// ОЧИСТКА KONTAKTY — дубликаты и тестовые
// ═══════════════════════════════════════════════════════════════════════════════

function cleanKontakty() {
  var sh = getBarowoSpreadsheet_().getSheetByName("Kontakty");
  if (!sh) return;
  var lastRow = sh.getLastRow();
  var removed = 0;

  // Удалить тестовые
  for (var r = lastRow; r >= 2; r--) {
    var name = (sh.getRange(r, 1).getValue() || "").toString().toLowerCase();
    if (name.indexOf("test") >= 0 || name.indexOf("dummy") >= 0 || name.indexOf("fake") >= 0) {
      sh.deleteRow(r); removed++;
    }
  }

  // Удалить дубликаты (оставляем первое вхождение — ближе к верху)
  lastRow = sh.getLastRow();
  var seen = {};
  for (var r2 = lastRow; r2 >= 2; r2--) {
    var n = (sh.getRange(r2, 1).getValue() || "").toString().trim().toLowerCase();
    var p = (sh.getRange(r2, 2).getValue() || "").toString().replace(/[^0-9]/g, "");
    if (!n && !p) { sh.deleteRow(r2); removed++; continue; }
    var key = n + "_" + p;
    if (seen[key]) { sh.deleteRow(r2); removed++; }
    else { seen[key] = true; }
  }

  // Условное форматирование (если ещё нет)
  lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  sh.clearConditionalFormatRules();
  if (lastRow > 1) {
    var dr = sh.getRange(2, 1, lastRow - 1, lastCol);
    sh.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$H2="signed"').setBackground("#D5F5E3").setRanges([dr]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$H2="cold"').setBackground("#FEF9E7").setRanges([dr]).build()
    ]);
  }

  Logger.log("✅ Kontakty: удалено " + removed + " (тесты + дубликаты), осталось " + (sh.getLastRow() - 1));
}
