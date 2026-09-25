function generateLeadId_() {
  return Utilities.getUuid().replace(/-/g, "").substring(0, 10).toUpperCase();
}

function validateWebsiteLead_(payload) {
  const errors = [];

  if (!payload.client_name) {
    errors.push("client_name is required");
  }

  if (!payload.email && !payload.phone) {
    errors.push("email or phone is required");
  }

  if (!payload.consent) {
    errors.push("privacy consent is required");
  }

  return errors;
}

function normalizeWebsiteLeadPayload_(params) {
  return {
    lead_id: generateLeadId_(),
    created_at: new Date().toISOString(),
    source: params.source || "website",
    status: "new",
    client_name: (params.name || "").trim(),
    phone: (params.phone || "").trim(),
    email: (params.email || "").trim(),
    event_type: (params.event_type || "").trim(),
    event_date: (params.event_date || "").trim(),
    city: (params.city || "").trim(),
    guests: (params.guests || "").trim(),
    package_name: (params.package || "").trim(),
    service_type: (params.serviceType || "").trim(),
    chocolate_fountain_interest: params.chocolateFountainInterest !== undefined ? String(params.chocolateFountainInterest).trim() : "",
    chocolate_fountain_mode: (params.chocolateFountainMode || "").trim(),
    recommended_package: (params.recommendedPackage || "").trim(),
    recommended_bartenders: (params.recommendedBartenders || "").trim(),
    recommended_menu_style: (params.recommendedMenuStyle || "").trim(),
    lead_note: (params.leadNote || "").trim(),
    planner_email_summary: (params.plannerEmailSummary || "").trim(),
    message: (params.message || "").trim(),
    manager_name: "",
    utm_source: (params.utm_source || "").trim(),
    utm_medium: (params.utm_medium || "").trim(),
    utm_campaign: (params.utm_campaign || "").trim(),
    utm_content: (params.utm_content || "").trim(),
    utm_term: (params.utm_term || "").trim(),
    page_url: (params.page_url || "").trim(),
    referrer: (params.referrer || "").trim(),
    consent: params.privacy_consent ? "yes" : "",
    raw_payload: JSON.stringify(params)
  };
}

function buildTelegramLeadMessage_(lead) {
  const isPlannerLead = (lead.source || "").toString().trim() === "Wedding Bar Planner";
  const lines = [
    isPlannerLead ? "💍 <b>Nowy lead z Planera Baru Weselnego</b>" : "🔥 <b>Nowy lead ze strony</b>",
    "",
    "👤 <b>" + (lead.client_name || "Bez imienia") + "</b>"
  ];

  if (lead.phone) {
    lines.push("📞 " + lead.phone);
  }

  if (lead.email) {
    lines.push("✉️ " + lead.email);
  }

  if (lead.event_type) {
    lines.push("🎉 " + lead.event_type);
  }

  if (lead.event_date) {
    lines.push("📅 " + lead.event_date);
  }

  if (lead.city) {
    lines.push("📍 " + lead.city);
  }

  if (lead.guests) {
    lines.push("👥 " + lead.guests);
  }

  if (lead.package_name) {
    lines.push("📦 " + lead.package_name);
  }

  if (lead.service_type) {
    lines.push("🧩 " + lead.service_type);
  }

  if (lead.recommended_bartenders) {
    lines.push("🍸 " + lead.recommended_bartenders + " barmanów");
  }

  if (lead.chocolate_fountain_interest) {
    lines.push("🍫 Fontanna: " + lead.chocolate_fountain_interest);
  }

  if (isPlannerLead && lead.lead_note) {
    lines.push("📋 " + lead.lead_note);
  }

  if (lead.message) {
    lines.push("");
    lines.push((isPlannerLead ? "🗒 Wiadomość klienta: " : "🗒 ") + lead.message);
  }

  lines.push("");
  lines.push("ID: <code>" + lead.lead_id + "</code>");

  return lines.join("\n");
}

function createWebsiteLead_(params) {
  const config = getBarowoConfig_();
  const honeypotValue = (params[config.honeypotField] || "").trim();

  if (honeypotValue) {
    appendLog_("warn", "site_lead", "honeypot triggered", {
      field: config.honeypotField
    });

    return {
      ok: true,
      status: "spam"
    };
  }

  const lead = normalizeWebsiteLeadPayload_(params);
  const validationErrors = validateWebsiteLead_(lead);

  if (validationErrors.length > 0) {
    appendLog_("warn", "site_lead", "validation failed", validationErrors);
    return {
      ok: false,
      errors: validationErrors
    };
  }

  appendRecordToSheet_(BAROWO_SHEET_SCHEMAS.leads, lead);
  upsertContactFromLead_(lead);
  appendLog_("info", "site_lead", "lead created", {
    lead_id: lead.lead_id,
    source: lead.source
  });
  sendTelegramLeadNotification_(lead);

  return {
    ok: true,
    status: "created",
    lead: lead
  };
}
