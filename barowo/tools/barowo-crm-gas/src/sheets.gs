const BAROWO_RUNTIME_CACHE = {
  spreadsheet: null,
  sheets: {}
};

function getBarowoSpreadsheet_() {
  if (!BAROWO_RUNTIME_CACHE.spreadsheet) {
    BAROWO_RUNTIME_CACHE.spreadsheet = SpreadsheetApp.openById(getBarowoConfig_().spreadsheetId);
  }

  return BAROWO_RUNTIME_CACHE.spreadsheet;
}

function getCachedSheetByName_(name) {
  if (!name) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(BAROWO_RUNTIME_CACHE.sheets, name) || !BAROWO_RUNTIME_CACHE.sheets[name]) {
    BAROWO_RUNTIME_CACHE.sheets[name] = getBarowoSpreadsheet_().getSheetByName(name);
  }

  return BAROWO_RUNTIME_CACHE.sheets[name];
}

function setCachedSheetByName_(name, sheet) {
  if (!name) {
    return sheet;
  }

  BAROWO_RUNTIME_CACHE.sheets[name] = sheet || null;
  return sheet;
}

function getOrCreateSheet_(schema) {
  const spreadsheet = getBarowoSpreadsheet_();
  let sheet = getCachedSheetByName_(schema.name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(schema.name);
    setCachedSheetByName_(schema.name, sheet);
  }

  ensureSheetHeaders_(sheet, schema.headers);
  return sheet;
}

function ensureSheetHeaders_(sheet, headers) {
  const currentColumnCount = Math.max(sheet.getLastColumn(), headers.length);
  const currentHeaderRow = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, currentColumnCount).getValues()[0]
    : [];

  const isEmpty = currentHeaderRow.slice(0, headers.length).every(function (value) {
    return !value;
  });

  if (sheet.getLastRow() === 0 || isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  headers.forEach(function (header, index) {
    const currentValue = currentHeaderRow[index];
    if (!currentValue) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });

  if (sheet.getFrozenRows() < 1) {
    sheet.setFrozenRows(1);
  }
}

function appendRecordToSheet_(schema, record) {
  const sheet = getOrCreateSheet_(schema);
  const row = schema.headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
  });
  sheet.appendRow(row);
  return row;
}

function appendLog_(level, context, message, payload) {
  appendRecordToSheet_(BAROWO_SHEET_SCHEMAS.logs, {
    created_at: new Date().toISOString(),
    level: level,
    context: context,
    message: message,
    payload: payload ? JSON.stringify(payload) : ""
  });
}

function bootstrapBarowoCRM() {
  listBarowoSchemas_().forEach(function (schema) {
    getOrCreateSheet_(schema);
  });

  appendLog_("info", "bootstrap", "BAROWO CRM sheets ensured", null);
}

function findMatchingContactRow_(lead) {
  const sheet = getOrCreateSheet_(BAROWO_SHEET_SCHEMAS.contacts);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return -1;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, BAROWO_SHEET_SCHEMAS.contacts.headers.length).getValues();
  const email = (lead.email || "").toString().trim().toLowerCase();
  const phone = normalizePhone_(lead.phone);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowEmail = (row[4] || "").toString().trim().toLowerCase();
    const rowPhone = normalizePhone_(row[3]);

    if (email && rowEmail && email === rowEmail) {
      return index + 2;
    }

    if (phone && rowPhone && phone === rowPhone) {
      return index + 2;
    }
  }

  return -1;
}

function upsertContactFromLead_(lead) {
  const sheet = getOrCreateSheet_(BAROWO_SHEET_SCHEMAS.contacts);
  const rowNumber = findMatchingContactRow_(lead);
  const record = {
    contact_id: lead.lead_id,
    created_at: new Date().toISOString(),
    client_name: lead.client_name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    last_event_type: lead.event_type,
    last_event_date: lead.event_date,
    lead_status: lead.status
  };

  if (rowNumber > 0) {
    const row = BAROWO_SHEET_SCHEMAS.contacts.headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
    });
    sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
    return rowNumber;
  }

  appendRecordToSheet_(BAROWO_SHEET_SCHEMAS.contacts, record);
  return sheet.getLastRow();
}

function normalizePhone_(value) {
  return (value || "")
    .toString()
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "");
}
