const LEGACY_LEAD_STAGE = Object.freeze({
  NEW: "new",
  ASSIGNED: "assigned",
  OFFER_DRAFT: "offer_draft",
  OFFER_SENT: "offer_sent",
  CONTRACT_GENERATED: "contract_generated",
  SIGNED: "signed",
  SPAM: "spam",
  DELETED: "deleted"
});

function normalizeComparablePhone_(value) {
  return (value || "")
    .toString()
    .replace(/^'/, "")
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "");
}

function normalizeComparableEmail_(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase();
}

function inferLegacyLeadStage_(row) {
  const explicitStage = (row[COL.LEAD_STATUS - 1] || "").toString().trim();
  if (explicitStage) {
    return explicitStage;
  }

  if ((row[COL.SPAM - 1] || "").toString() === "YES") {
    return LEGACY_LEAD_STAGE.SPAM;
  }

  if ((row[COL.UMOWA - 1] || "").toString() === "YES") {
    return LEGACY_LEAD_STAGE.SIGNED;
  }

  if ((row[COL.OFERTA - 1] || "").toString() === "YES") {
    return LEGACY_LEAD_STAGE.OFFER_SENT;
  }

  if ((row[COL.ASSIGNED - 1] || "").toString().trim()) {
    return LEGACY_LEAD_STAGE.ASSIGNED;
  }

  return LEGACY_LEAD_STAGE.NEW;
}

function setLegacyLeadStage_(sheet, rowNumber, stage) {
  if (!sheet || rowNumber < 2 || !stage) {
    return;
  }

  sheet.getRange(rowNumber, COL.LEAD_STATUS).setValue(stage);
}

function getLegacyLeadStageLabel_(stage) {
  const labels = {};
  labels[LEGACY_LEAD_STAGE.NEW] = "Nowy lead";
  labels[LEGACY_LEAD_STAGE.ASSIGNED] = "Przypisany";
  labels[LEGACY_LEAD_STAGE.OFFER_DRAFT] = "Szkic oferty";
  labels[LEGACY_LEAD_STAGE.OFFER_SENT] = "Oferta wysłana";
  labels[LEGACY_LEAD_STAGE.CONTRACT_GENERATED] = "Umowa wygenerowana";
  labels[LEGACY_LEAD_STAGE.SIGNED] = "Podpisane / booked";
  labels[LEGACY_LEAD_STAGE.SPAM] = "Spam";
  labels[LEGACY_LEAD_STAGE.DELETED] = "Usunięty";
  return labels[stage] || "Nowy lead";
}

function slugifyTeamName_(name) {
  return (name || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getSchemaFieldIndex_(schema, fieldName) {
  return schema.headers.indexOf(fieldName);
}

function findSchemaRowByField_(schema, fieldName, value) {
  const fieldIndex = getSchemaFieldIndex_(schema, fieldName);
  if (fieldIndex < 0 || value === null || value === undefined || value === "") {
    return -1;
  }

  const sheet = getOrCreateSheet_(schema);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return -1;
  }

  const columnValues = sheet.getRange(2, fieldIndex + 1, lastRow - 1, 1).getValues();
  const comparableValue = value.toString();

  for (let index = 0; index < columnValues.length; index += 1) {
    if ((columnValues[index][0] || "").toString() === comparableValue) {
      return index + 2;
    }
  }

  return -1;
}

function upsertSchemaRecord_(schema, keyField, keyValue, record) {
  const sheet = getOrCreateSheet_(schema);
  const row = schema.headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "";
  });
  const existingRow = findSchemaRowByField_(schema, keyField, keyValue);

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    return existingRow;
  }

  sheet.appendRow(row);
  return sheet.getLastRow();
}

function getLegacyLeadSource_(legacyRow) {
  return (legacyRow[COL.LEAD_SOURCE - 1] || legacyRow[11] || "legacy").toString().trim() || "legacy";
}

function buildStructuredLeadRawPayload_(legacyRow, websitePayload) {
  if (websitePayload) {
    return JSON.stringify(websitePayload);
  }

  return JSON.stringify({
    legacy_uid: getLeadUID(legacyRow),
    note: legacyRow[COL.NOTE - 1] || "",
    call_history: legacyRow[COL.CALLHIST - 1] || "",
    next_call: legacyRow[COL.NEXTCALL - 1] || ""
  });
}

function upsertStructuredLeadFromLegacyRow_(legacyRow, options) {
  const legacyUid = getLeadUID(legacyRow);
  if (!legacyUid) {
    return null;
  }

  const stage = inferLegacyLeadStage_(legacyRow);
  const websitePayload = options && options.websitePayload ? options.websitePayload : null;

  const record = {
    lead_id: "legacy_" + legacyUid,
    legacy_uid: legacyUid,
    created_at: legacyRow[1] || new Date().toISOString(),
    source: websitePayload && websitePayload.source ? websitePayload.source : getLegacyLeadSource_(legacyRow),
    status: stage,
    client_name: legacyRow[COL.NAME - 1] || "",
    phone: (legacyRow[COL.PHONE - 1] || "").toString().replace(/^'/, ""),
    email: legacyRow[COL.EMAIL - 1] || "",
    event_type: legacyRow[COL.EVENT - 1] || "",
    event_date: formatDate(legacyRow[COL.DATE - 1]),
    city: legacyRow[COL.CITY - 1] || "",
    guests: legacyRow[COL.GUESTS - 1] || "",
    package_name: legacyRow[COL.PACKAGE - 1] || "",
    service_type: websitePayload ? (websitePayload.serviceType || "") : "",
    chocolate_fountain_interest: websitePayload && websitePayload.chocolateFountainInterest !== undefined
      ? String(websitePayload.chocolateFountainInterest)
      : "",
    chocolate_fountain_mode: websitePayload ? (websitePayload.chocolateFountainMode || "") : "",
    recommended_package: websitePayload ? (websitePayload.recommendedPackage || "") : "",
    recommended_bartenders: websitePayload ? (websitePayload.recommendedBartenders || "") : "",
    recommended_menu_style: websitePayload ? (websitePayload.recommendedMenuStyle || "") : "",
    lead_note: websitePayload ? (websitePayload.leadNote || "") : "",
    planner_email_summary: websitePayload ? (websitePayload.plannerEmailSummary || "") : "",
    message: legacyRow[COL.NOTE - 1] || "",
    manager_name: legacyRow[COL.ASSIGNED - 1] || "",
    utm_source: websitePayload ? (websitePayload.utm_source || "") : "",
    utm_medium: websitePayload ? (websitePayload.utm_medium || "") : "",
    utm_campaign: websitePayload ? (websitePayload.utm_campaign || "") : "",
    utm_content: websitePayload ? (websitePayload.utm_content || "") : "",
    utm_term: websitePayload ? (websitePayload.utm_term || "") : "",
    page_url: websitePayload ? (websitePayload.page_url || "") : "",
    referrer: websitePayload ? (websitePayload.referrer || "") : "",
    consent: websitePayload && websitePayload.privacy_consent ? "yes" : "",
    raw_payload: buildStructuredLeadRawPayload_(legacyRow, websitePayload)
  };

  upsertSchemaRecord_(BAROWO_SHEET_SCHEMAS.leads, "legacy_uid", legacyUid, record);
  return record;
}

function upsertStructuredContactFromLegacyRow_(legacyRow) {
  const legacyUid = getLeadUID(legacyRow);
  if (!legacyUid) {
    return null;
  }

  const record = {
    contact_id: "contact_" + legacyUid,
    legacy_uid: legacyUid,
    created_at: new Date().toISOString(),
    client_name: legacyRow[COL.NAME - 1] || "",
    phone: (legacyRow[COL.PHONE - 1] || "").toString().replace(/^'/, ""),
    email: legacyRow[COL.EMAIL - 1] || "",
    city: legacyRow[COL.CITY - 1] || "",
    last_event_type: legacyRow[COL.EVENT - 1] || "",
    last_event_date: formatDate(legacyRow[COL.DATE - 1]),
    lead_status: inferLegacyLeadStage_(legacyRow)
  };

  upsertSchemaRecord_(BAROWO_SHEET_SCHEMAS.contacts, "legacy_uid", legacyUid, record);
  return record;
}

function syncLegacyLeadToModernCrm_(legacyRow, options) {
  if (!getBarowoConfig_().enableModernSync) {
    return null;
  }
  const lead = upsertStructuredLeadFromLegacyRow_(legacyRow, options || {});
  upsertStructuredContactFromLegacyRow_(legacyRow);
  return lead;
}
