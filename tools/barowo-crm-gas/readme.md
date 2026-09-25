# BAROWO CRM Apps Script

Source-controlled BAROWO CRM for Google Sheets + Telegram.

## What this project includes

- legacy BAROWO Telegram CRM logic migrated out of the old RTF export
- website lead intake from `barowo.com`
- Google Sheets operational datastore
- Cloudflare Worker relay support for stable Telegram webhook delivery
- structured sync layer for cleaner lead, contact and reporting data (`Leads`, `Contacts`, `Logs`)
- Google Calendar, Gmail draft, contract generation, tasks, reminders, reporting

## Folder structure

- `src/appsscript.json`: Apps Script manifest
- `src/Config.gs`: runtime config and Script Properties helpers
- `src/Schema.gs`: sheet definitions
- `src/Sheets.gs`: spreadsheet bootstrap and persistence helpers
- `src/LeadService.gs`: website lead normalization and storage
- `src/Telegram.gs`: Telegram helpers and webhook bridge
- `src/WebApp.gs`: `doGet` / `doPost` entrypoints

## Current architecture

- `Lidy / Spam / Kontakty / Finanse / Log` remain the day-to-day ops sheets for the Telegram CRM
- `Leads / Contacts / Logs` are the structured layer for cleaner reporting
- website leads enter the legacy CRM immediately and are synced into the structured layer
- client-facing private pages are intentionally out of scope

## Setup

1. Open a terminal in this folder:

```bash
cd /Users/ivantarasuk/Desktop/Barowo/barowoweb/tools/barowo-crm-gas
```

2. Install dependencies:

```bash
npm install
```

3. Authenticate `clasp`:

```bash
npm run login
```

4. Create a new Apps Script project in the browser and copy its script id.

5. Copy `.clasp.json.example` to `.clasp.json` and paste your real script id.

6. Push the scaffold:

```bash
npm run push
```

7. In Apps Script, set these Script Properties:

- `BAROWO_SPREADSHEET_ID`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_GROUP_CHAT_ID`
- `BAROWO_FORM_SUCCESS_URL`
- `BAROWO_WEB_APP_URL`
- optionally `BAROWO_MANAGER_EMAIL`
- optionally `BAROWO_MANAGER_PHONE`
- optionally `BAROWO_BRAND_NAME`
- optionally `BAROWO_CALENDAR_NAME`
- optionally `BAROWO_DEPOSIT_AMOUNT`
- optionally `BAROWO_EXTRA_HOUR_AMOUNT`
- optionally `BAROWO_PENALTY_AMOUNT`
- optionally `BAROWO_UMOWA_TEMPLATE_ID`
- optionally `BAROWO_OFFER_PDF_FILE_ID`
- optionally `BAROWO_ENABLE_MODERN_SYNC`

8. Run `finalizeBarowoCrmSetup` once from the Apps Script editor.

9. Deploy the script as a Web App:

- Execute as: `Me`
- Who has access: `Anyone`

10. Put the Web App URL into the BAROWO website form action.

## Telegram webhook

Use the Cloudflare relay described in [docs/telegram-relay-setup.md](/Users/ivantarasuk/Desktop/Barowo/barowoweb/docs/telegram-relay-setup.md).

The direct Apps Script webhook path is intentionally no longer the recommended production mode.
