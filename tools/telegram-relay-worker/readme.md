# BAROWO Telegram Relay Worker

Lightweight Cloudflare Worker that gives Telegram an instant `200 OK` webhook endpoint and forwards updates to the BAROWO Apps Script CRM.

The same Worker also exposes `/lead` for public website lead forms. Lead form POST requests return a fast accepted response and forward to Apps Script in the background, so visitors do not wait on CRM processing.

## Why this exists

Telegram retries aggressively when the direct Apps Script webhook responds with `302 Moved Temporarily`. A Worker fixes that by:

- receiving the Telegram webhook instantly
- returning `200 OK` immediately
- forwarding the update to Apps Script in the background

## Required secrets

- `APPS_SCRIPT_WEBHOOK_URL`
- `APPS_SCRIPT_RELAY_SECRET`
- `TELEGRAM_WEBHOOK_SECRET`

## Local commands

```bash
npm install
npm run check
npm run deploy
```

## Cloudflare secrets

```bash
npx wrangler secret put APPS_SCRIPT_WEBHOOK_URL
npx wrangler secret put APPS_SCRIPT_RELAY_SECRET
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

## Telegram webhook

After deploy, point Telegram to your Worker URL and pass `secret_token=TELEGRAM_WEBHOOK_SECRET`.
