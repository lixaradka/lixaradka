const BAROWO_SHEET_SCHEMAS = Object.freeze({
  leads: {
    name: BAROWO_DEFAULTS.leadsSheetName,
    headers: [
      "lead_id",
      "legacy_uid",
      "created_at",
      "source",
      "status",
      "client_name",
      "phone",
      "email",
      "event_type",
      "event_date",
      "city",
      "guests",
      "package_name",
      "service_type",
      "chocolate_fountain_interest",
      "chocolate_fountain_mode",
      "recommended_package",
      "recommended_bartenders",
      "recommended_menu_style",
      "lead_note",
      "planner_email_summary",
      "message",
      "manager_name",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "page_url",
      "referrer",
      "consent",
      "raw_payload"
    ]
  },
  contacts: {
    name: BAROWO_DEFAULTS.contactsSheetName,
    headers: [
      "contact_id",
      "legacy_uid",
      "created_at",
      "client_name",
      "phone",
      "email",
      "city",
      "last_event_type",
      "last_event_date",
      "lead_status"
    ]
  },
  logs: {
    name: BAROWO_DEFAULTS.logsSheetName,
    headers: [
      "created_at",
      "level",
      "context",
      "message",
      "payload"
    ]
  }
});

function listBarowoSchemas_() {
  return [
    BAROWO_SHEET_SCHEMAS.leads,
    BAROWO_SHEET_SCHEMAS.contacts,
    BAROWO_SHEET_SCHEMAS.logs
  ];
}
