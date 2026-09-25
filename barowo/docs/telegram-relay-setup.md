# BAROWO Telegram Relay Setup

## Why this exists

Direct Telegram -> Google Apps Script webhook delivery is unstable for BAROWO because Apps Script returns `302 Moved Temporarily` on JSON webhook requests. Telegram retries those updates, which causes:

- duplicated messages
- laggy inline buttons
- broken assignments
- delayed command handling

The relay fixes that:

- Telegram sends updates to Cloudflare Worker
- Worker immediately returns `200 OK`
- Worker forwards the payload to Apps Script in the background
- CRM still stays on Google Sheets + Apps Script

## What stays the same

- BAROWO site stays on Netlify
- CRM data stays in Google Sheets
- Telegram business logic stays in Apps Script

## What changes

- Telegram webhook no longer points directly to Apps Script
- Telegram webhook points to Cloudflare Worker

## Files

- Relay worker: [tools/telegram-relay-worker/src/index.js](/Users/ivantarasuk/Desktop/Barowo/barowoweb/tools/telegram-relay-worker/src/index.js)
- Worker config: [tools/telegram-relay-worker/wrangler.jsonc](/Users/ivantarasuk/Desktop/Barowo/barowoweb/tools/telegram-relay-worker/wrangler.jsonc)
- Apps Script webhook authorization: [tools/barowo-crm-gas/src/WebApp.gs](/Users/ivantarasuk/Desktop/Barowo/barowoweb/tools/barowo-crm-gas/src/WebApp.gs)

## Setup steps

1. Log into Cloudflare in the worker folder with `npx wrangler login`.
2. Generate two long random secrets.
3. Add `TELEGRAM_RELAY_SHARED_SECRET` to Apps Script Script Properties.
If it is not set yet, the first trusted relay request can bootstrap it automatically. After it is set, mismatched relay tokens are rejected and should be fixed by updating the Worker secret.
4. Add Worker secrets:
   - `APPS_SCRIPT_WEBHOOK_URL`
   - `APPS_SCRIPT_RELAY_SECRET`
   - `TELEGRAM_WEBHOOK_SECRET`
5. Deploy the Worker with `npx wrangler deploy`.
6. Copy the Worker public URL.
7. Set Telegram webhook to the Worker URL and pass `secret_token=TELEGRAM_WEBHOOK_SECRET`.
8. Run `finalizeBarowoCrmSetup` once in Apps Script to refresh installable triggers and remove the old polling setup.

## Required values

- `APPS_SCRIPT_WEBHOOK_URL`
  Use the Apps Script exec URL:
  `https://script.google.com/macros/s/AKfycbwGS-1m9aWnt2rBAOfdvXx-XifDAAqW_xSGWQlnZYzAi3J105z2QDzbonCWDG9J--24pA/exec`

- `APPS_SCRIPT_RELAY_SECRET`
  Must be exactly the same as Apps Script property `TELEGRAM_RELAY_SHARED_SECRET`.

- `TELEGRAM_WEBHOOK_SECRET`
  A separate secret used by Telegram -> Worker webhook verification.

## Commands

```bash
source ~/.zshrc
cd /Users/ivantarasuk/Desktop/Barowo/barowoweb/tools/telegram-relay-worker
npm install
npx wrangler login
```

```bash
source ~/.zshrc
cd /Users/ivantarasuk/Desktop/Barowo/barowoweb/tools/telegram-relay-worker
npx wrangler secret put APPS_SCRIPT_WEBHOOK_URL
npx wrangler secret put APPS_SCRIPT_RELAY_SECRET
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler deploy
```

## After deploy

Set the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=<YOUR_WORKER_URL>" \
  --data-urlencode "secret_token=<YOUR_TELEGRAM_WEBHOOK_SECRET>" \
  --data-urlencode "drop_pending_updates=true"
```

## Expected result

- `/ping` responds almost immediately
- `/help` responds almost immediately
- inline assignment buttons stop reverting
- no more duplicate updates from Telegram retries
