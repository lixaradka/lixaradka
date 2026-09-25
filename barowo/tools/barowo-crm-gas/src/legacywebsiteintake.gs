function normalizeLegacyWebsitePhone_(value) {
  const phone = (value || "").toString().trim();
  return phone ? "'" + phone : "";
}

function buildLegacyWebsiteLeadNote_(params) {
  const parts = [];
  const message = (params.message || "").trim();
  const source = (params.source || "website").trim();
  const isPlannerLead = source === "Wedding Bar Planner";
  const serviceType = (params.serviceType || "").trim();
  const venueName = (params.venueName || "").trim();
  const chocolateInterest = params.chocolateFountainInterest !== undefined
    ? String(params.chocolateFountainInterest).trim()
    : "";
  const chocolateMode = (params.chocolateFountainMode || "").trim();
  const recommendedPackage = (params.recommendedPackage || "").trim();
  const recommendedBartenders = (params.recommendedBartenders || "").trim();
  const recommendedMenuStyle = (params.recommendedMenuStyle || "").trim();
  const leadNote = (params.leadNote || "").trim();
  const plannerEmailSummary = (params.plannerEmailSummary || "").trim();
  const plannerSummary = [
    params.barFormat ? "format baru=" + params.barFormat : "",
    params.weddingStyle ? "styl wesela=" + params.weddingStyle : "",
    params.drinkPreferences ? "drinki=" + params.drinkPreferences : "",
    params.alcoholPreference ? "alkohol=" + params.alcoholPreference : "",
    params.expectationLevel ? "oczekiwania=" + params.expectationLevel : ""
  ].filter(Boolean).join(", ");
  const utmSummary = [
    params.utm_source ? "utm_source=" + params.utm_source : "",
    params.utm_medium ? "utm_medium=" + params.utm_medium : "",
    params.utm_campaign ? "utm_campaign=" + params.utm_campaign : "",
    params.utm_content ? "utm_content=" + params.utm_content : "",
    params.utm_term ? "utm_term=" + params.utm_term : ""
  ].filter(Boolean).join(", ");

  if (isPlannerLead) {
    if (recommendedPackage || recommendedBartenders || recommendedMenuStyle) {
      parts.push(
        "Rekomendacja: pakiet=" + (recommendedPackage || "-") +
        ", barmani=" + (recommendedBartenders || "-") +
        ", menu=" + (recommendedMenuStyle || "-")
      );
    }
    if (plannerSummary) {
      parts.push("Preferencje: " + plannerSummary);
    }
    if (venueName) {
      parts.push("Sala / miejscowość: " + venueName);
    }
    if (chocolateInterest) {
      parts.push("Fontanna czekoladowa: " + chocolateInterest);
    }
    if (chocolateMode) {
      parts.push("Tryb fontanny: " + chocolateMode);
    }
    if (message) {
      parts.push("Wiadomość klienta: " + message);
    }
    if (leadNote) {
      parts.push("Planner: " + leadNote);
    }
    return parts.join("\n");
  }

  if (message) {
    parts.push("WWW: " + message);
  }
  if (source) {
    parts.push("Źródło: " + source);
  }
  if (serviceType) {
    parts.push("Usługa: " + serviceType);
  }
  if (venueName) {
    parts.push("Sala / miejscowość: " + venueName);
  }
  if (chocolateInterest) {
    parts.push("Fontanna czekoladowa: " + chocolateInterest);
  }
  if (chocolateMode) {
    parts.push("Tryb fontanny: " + chocolateMode);
  }
  if (recommendedPackage || recommendedBartenders || recommendedMenuStyle) {
    parts.push(
      "Rekomendacja: pakiet=" + (recommendedPackage || "-") +
      ", barmani=" + (recommendedBartenders || "-") +
      ", menu=" + (recommendedMenuStyle || "-")
    );
  }
  if (plannerSummary) {
    parts.push("Planner: " + plannerSummary);
  }
  if (leadNote) {
    parts.push("Planner note: " + leadNote);
  }
  if (plannerEmailSummary) {
    parts.push("Planner email: " + plannerEmailSummary);
  }
  if (utmSummary) {
    parts.push("UTM: " + utmSummary);
  }
  if (params.page_url) {
    parts.push("Page: " + params.page_url);
  }
  if (params.referrer) {
    parts.push("Referrer: " + params.referrer);
  }

  return parts.join("\n");
}

function buildLegacyWebsiteLeadRow_(params, uid) {
  const row = new Array(COL.CLIENT_ADDRESS).fill("");
  const nowIso = new Date().toISOString();
  const guests = (params.guests || "").trim();
  const note = buildLegacyWebsiteLeadNote_(params);

  row[COL.UID - 1] = uid;
  row[COL.CREATED_AT - 1] = nowIso;
  row[11] = "website";
  row[COL.EVENT - 1] = (params.event_type || "").trim();
  row[13] = guests;
  row[COL.DATE - 1] = (params.event_date || "").trim();
  row[COL.CITY - 1] = (params.city || "").trim();
  row[COL.NAME - 1] = (params.name || "").trim();
  row[COL.EMAIL - 1] = (params.email || "").trim();
  row[COL.PHONE - 1] = normalizeLegacyWebsitePhone_(params.phone);
  row[COL.LEAD_SOURCE - 1] = (params.source || "website").trim();
  row[COL.LEAD_STATUS - 1] = LEGACY_LEAD_STAGE.NEW;
  row[COL.SENT - 1] = "";
  row[COL.GUESTS - 1] = guests;
  row[COL.PACKAGE - 1] = (params.package || params.recommendedPackage || "").trim();
  row[COL.NOTE - 1] = note;
  row[COL.CLIENT_FULL_NAME - 1] = (params.name || "").trim();

  return row;
}

function validateLegacyWebsiteLead_(params) {
  const errors = [];

  if (!(params.name || "").trim()) {
    errors.push("name is required");
  }

  if (!(params.email || "").trim() && !(params.phone || "").trim()) {
    errors.push("email or phone is required");
  }

  if (!params.privacy_consent) {
    errors.push("privacy consent is required");
  }

  return errors;
}

function notifyLegacyTeamAboutLead_(row, uid, isDuplicate) {
  const prefix = isDuplicate ? "♻️ <b>Zaktualizowano istniejący lead</b>\n\n" : "";
  const cardText = prefix + buildLeadText(row) + statusLineFromRow(row);
  send(CONFIG.GROUP_CHAT_ID, cardText, keyboard(uid, false));
}

function mergeLegacyWebsiteLeadIntoExisting_(sh, rowNumber, params) {
  const row = sh.getRange(rowNumber, 1, 1, sh.getLastColumn()).getValues()[0];
  const mergedNote = buildLegacyWebsiteLeadNote_(params);

  if (!row[COL.EVENT - 1] && params.event_type) row[COL.EVENT - 1] = params.event_type.trim();
  if (!row[COL.DATE - 1] && params.event_date) row[COL.DATE - 1] = params.event_date.trim();
  if (!row[COL.CITY - 1] && params.city) row[COL.CITY - 1] = params.city.trim();
  if (!row[COL.EMAIL - 1] && params.email) row[COL.EMAIL - 1] = params.email.trim();
  if (!row[COL.PHONE - 1] && params.phone) row[COL.PHONE - 1] = normalizeLegacyWebsitePhone_(params.phone);
  if (!row[COL.GUESTS - 1] && params.guests) row[COL.GUESTS - 1] = params.guests.trim();
  if (!row[COL.PACKAGE - 1] && params.package) row[COL.PACKAGE - 1] = params.package.trim();
  if (!row[COL.CLIENT_FULL_NAME - 1] && params.name) row[COL.CLIENT_FULL_NAME - 1] = params.name.trim();
  row[COL.LEAD_SOURCE - 1] = (params.source || row[COL.LEAD_SOURCE - 1] || "website").toString().trim();

  if (mergedNote) {
    const currentNote = (row[COL.NOTE - 1] || "").toString().trim();
    row[COL.NOTE - 1] = currentNote
      ? currentNote + "\n\n---\n" + mergedNote
      : mergedNote;
  }

  sh.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  return row;
}

function createLegacyWebsiteLead_(params) {
  const config = getBarowoConfig_();
  const honeypotValue = (params[config.honeypotField] || "").trim();

  if (honeypotValue) {
    appendLog_("warn", "legacy_site_lead", "honeypot triggered", {
      field: config.honeypotField
    });
    return { ok: true, status: "spam" };
  }

  const errors = validateLegacyWebsiteLead_(params);
  if (errors.length > 0) {
    appendLog_("warn", "legacy_site_lead", "validation failed", errors);
    return { ok: false, errors: errors };
  }

  const sh = sheetLidy();
  if (!sh) {
    bootstrapLegacyCrmSheets_();
  }

  const leadsSheet = sheetLidy();
  if (!leadsSheet) {
    throw new Error("Sheet '" + CONFIG.SHEET_LIDY + "' not found in CRM spreadsheet.");
  }

  const duplicateRow = findDuplicateLegacyLeadRow_(leadsSheet, params.name, params.phone, params.email);
  if (duplicateRow > 0) {
    const mergedRow = mergeLegacyWebsiteLeadIntoExisting_(leadsSheet, duplicateRow, params);
    const duplicateUid = getLeadUID(mergedRow);
    cacheLeadRowNumber_(leadsSheet, duplicateUid, duplicateRow);

    try {
      notifyLegacyTeamAboutLead_(mergedRow, duplicateUid, true);
      leadsSheet.getRange(duplicateRow, COL.SENT).setValue("SENT_" + new Date().getTime());
    } catch (error) {
      appendLog_("error", "legacy_site_lead", "failed to notify telegram about duplicate", {
        uid: duplicateUid,
        message: error.message
      });
    }

    addToKontakty(mergedRow);
    syncLegacyLeadToModernCrm_(mergedRow, { websitePayload: params });

    appendLog_("info", "legacy_site_lead", "duplicate merged into legacy CRM", {
      uid: duplicateUid,
      name: mergedRow[COL.NAME - 1] || "",
      source: params.source || "website"
    });

    return {
      ok: true,
      status: "merged",
      uid: duplicateUid
    };
  }

  const uid = generateUID();
  const row = buildLegacyWebsiteLeadRow_(params, uid);
  const insertedRowNumber = leadsSheet.getLastRow() + 1;
  leadsSheet.getRange(insertedRowNumber, 1, 1, row.length).setValues([row]);
  cacheLeadRowNumber_(leadsSheet, uid, insertedRowNumber);

  const savedRow = row.slice();

  try {
    notifyLegacyTeamAboutLead_(savedRow, uid, false);
    leadsSheet.getRange(insertedRowNumber, COL.SENT).setValue("SENT_" + new Date().getTime());
  } catch (error) {
    appendLog_("error", "legacy_site_lead", "failed to notify telegram", {
      uid: uid,
      message: error.message
    });
  }

  try {
    addToKontakty(savedRow);
  } catch (error) {
    appendLog_("error", "legacy_site_lead", "failed to sync contacts", {
      uid: uid,
      message: error.message
    });
  }

  try {
    syncLegacyLeadToModernCrm_(savedRow, { websitePayload: params });
  } catch (error) {
    appendLog_("error", "legacy_site_lead", "failed to sync modern CRM", {
      uid: uid,
      message: error.message
    });
  }

  appendLog_("info", "legacy_site_lead", "lead created in legacy CRM", {
    uid: uid,
    name: savedRow[COL.NAME - 1] || "",
    source: params.source || "website"
  });

  try {
    logAction("Website", "new_lead_site", savedRow[COL.NAME - 1], params.source || "website");
  } catch (error) {
    appendLog_("error", "legacy_site_lead", "failed to write legacy log", {
      uid: uid,
      message: error.message
    });
  }

  return {
    ok: true,
    status: "created",
    uid: uid
  };
}
