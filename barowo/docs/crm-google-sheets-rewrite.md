# BAROWO CRM Rewrite

## Goal

Rewrite the current BAROWO CRM into a maintainable Google Apps Script project that:

- keeps Google Sheets as the operational datastore,
- accepts leads from the BAROWO website,
- notifies the team in Telegram,
- stays compatible with the current ops workflow.

## Why the current setup needs a rewrite

The current CRM code lives as one large Apps Script file exported into RTF. That causes several problems:

- the code is hard to version and review,
- secrets are mixed into business logic,
- the site is not connected directly to the CRM pipeline,
- lead intake, Telegram webhook logic, documents, and spreadsheet access are tightly coupled,
- extending operational automation will become risky very quickly without a cleaner module split.

## Recommended target architecture

### Data flow

1. User submits the lead form on `barowo.com`.
2. The form posts to a Google Apps Script Web App endpoint.
3. Apps Script validates and normalizes the payload.
4. Apps Script writes the lead into the `Leads` sheet.
5. Apps Script upserts the contact into the `Contacts` sheet.
6. Apps Script sends a Telegram notification to the BAROWO group.
7. The CRM team continues operating from Telegram + Google Sheets.

This keeps Netlify lightweight:

- no rebuilds when new leads arrive,
- no deploys for CRM changes,
- no Formspree dependency,
- no need for Meta integration to make the pipeline work.

## Why Google Apps Script is the right bridge here

For BAROWO today it is the cheapest and fastest option because:

- you already use Telegram + Sheets + Google Calendar,
- the CRM logic already lives in Apps Script,
- the website is static, so we should not add a heavy backend too early,
- the business flow is still operator-driven rather than self-serve.

## Sheet structure for the rewrite

### `Leads`

Main intake sheet for all website and manual leads.

Suggested columns:

- `lead_id`
- `created_at`
- `source`
- `status`
- `client_name`
- `phone`
- `email`
- `event_type`
- `event_date`
- `city`
- `guests`
- `package_name`
- `message`
- `manager_name`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `page_url`
- `referrer`
- `consent`
- `raw_payload`

### `Contacts`

Deduplicated contact list.

Suggested columns:

- `contact_id`
- `created_at`
- `client_name`
- `phone`
- `email`
- `city`
- `last_event_type`
- `last_event_date`
- `lead_status`

### `Logs`

Operational log for debugging and audit.

Suggested columns:

- `created_at`
- `level`
- `context`
- `message`
- `payload`

## Routing recommendation for the website form

For the cheapest setup, keep the current form UI and change only the submit target:

- the frontend stays on the BAROWO site,
- the form posts to the Apps Script Web App URL,
- Apps Script writes to Sheets and redirects the user back to a thank-you state.

This avoids:

- Formspree cost,
- Netlify Functions dependency for basic lead intake,
- rebuilds or deploys when leads arrive.

## Security notes

Do this before going live:

- move all secrets to Script Properties,
- rotate the current Telegram bot token,
- remove public CSV exports with `ANYONE_WITH_LINK`,
- add a honeypot field to the site form,
- optionally add Cloudflare Turnstile later if spam becomes a problem.

## Migration approach

### Phase 1

- create a local Apps Script project with `clasp`,
- move the CRM out of RTF and into source files,
- bootstrap the new sheet structure,
- add the website lead intake endpoint,
- send Telegram notifications from the new endpoint.

### Phase 2

- port the existing Telegram lead workflow into modules,
- keep Google Calendar and finance helpers,
- migrate remaining legacy sheet logic carefully,
- retire the old monolithic script.

### Phase 3

- add better reporting for lead sources, response speed and booking rate,
- add cleaner offer / contract status tracking,
- add automated reminders for stale leads and next-contact dates.

## What should be enabled on the computer / account

### On the computer

- Node.js 20 LTS
- npm
- `@google/clasp`

### In Google

- Google Apps Script API
- a dedicated Google Spreadsheet for BAROWO CRM
- access to the Google account that owns the spreadsheet
- Telegram bot token and group chat id

## Practical recommendation

Do not keep developing the CRM from the RTF file.

The right next step is:

1. create a proper local Apps Script project,
2. wire the site form into that project,
3. only then start moving the rest of the Telegram CRM logic into modules.
