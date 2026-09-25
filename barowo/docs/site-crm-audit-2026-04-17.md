# BAROWO Site + CRM Audit

Date: 2026-04-17

## Executive Summary

The highest-risk issue was the site form pointing at an old Apps Script endpoint that returned `404`. That issue was hotfixed first. The second high-risk issue was blind form success reporting on a fire-and-forget `no-cors` request. That has now been replaced with a worker relay that returns a real JSON success or error. The next major risk is silent lock contention inside the CRM bot. The biggest search opportunity is stronger local-business and social metadata completeness for BAROWO's homepage and article templates.

## Highest Priority Findings

### P0 — Website form truthfulness was previously broken and needed a relay fix

File: `index.html`

- Previously the form used `fetch(..., { mode: 'no-cors' })`.
- Success was shown immediately after the fire-and-forget request.
- That meant the user could see a green success message even if the request never reached CRM.

Why it matters:

- This is exactly the kind of failure that hides lost leads.
- The business gets a false sense that lead capture is healthy.

Current state:

- This has now been fixed in code by routing submissions through a worker relay that returns a real JSON response.
- The site should now show success only after the relay confirms the CRM accepted the lead.

Recommended follow-up:

- Keep the automated lead-flow health monitoring active in CRM.
- Re-test the live form after every production change to the worker or Apps Script deployment.

### P0 — Lead endpoint drift can break intake again

Files: `index.html`, `tools/barowo-crm-gas/src/Monitoring.gs`

- The site form action is hardcoded in HTML.
- When the live Apps Script deployment changes, the site can drift away from the active endpoint.

What is now in place:

- A CRM-side health monitor now checks:
  - homepage availability
  - lead form action URL
  - whether the homepage action matches the expected active CRM endpoint
  - whether the CRM endpoint responds successfully
- On failure it sends a Telegram alert to the group.
- On recovery it sends a Telegram recovery message.

### P1 — CRM lock contention is still a real source of slow or silent behavior

File: `tools/barowo-crm-gas/src/LegacyBot.gs`

- Many write flows are wrapped in `withLock(...)`.
- `withLock(...)` currently swallows lock timeouts instead of surfacing a strong user-visible error.
- This can look like “the button did nothing”.

Why it matters:

- It directly affects assign, spam, notes, next call, calendar, draft and contract actions.
- This is a likely reason for the “laggy / silent” feeling in Telegram.

Recommended fix:

- Refactor `withLock(...)` so that lock failure becomes an explicit result.
- Send a clear temporary Telegram reply like “CRM is busy, try again in a moment”.
- Remove repeated full-sheet reads inside callback flows.

### P1 — Website public page still loads extra non-essential scripts

File: `index.html`

- The public homepage previously loaded Netlify Identity and local preview helpers.
- Netlify Identity has now been removed from the public homepage.
- Local preview remains only as a file-protocol helper.

Why it matters:

- They are not needed for a normal public visitor on BAROWO.
- They add extra JS work and complexity on the main landing page.

Recommended fix:

- Keep Netlify Identity limited to `/admin/`.
- Keep local preview helpers limited to file-preview mode, not normal production browsing.

### P1 — Homepage local business schema is too thin

File: `index.html`

Homepage currently includes `LocalBusiness`, which is good, but it is missing several useful local-search signals:

- street address
- postal code
- opening hours or explicit service availability
- `sameAs` social profiles
- image/logo richness
- stronger business identity fields

Why it matters:

- BAROWO is a local service brand.
- Stronger local business markup improves consistency between site content, Business Profile and search understanding.

Recommended fix:

- Expand homepage structured data with more complete `LocalBusiness` information.
- Make sure the schema matches visible on-page business details.

### P1 — Article schema is usable, but incomplete

Files: `aktualnosci/*/index.html`

Current blog articles include `BlogPosting`, but the schema is missing several recommended article properties:

- `datePublished`
- `dateModified`
- richer author identity
- author URL or `sameAs`

Why it matters:

- The article templates are already close.
- Adding the missing properties strengthens article eligibility and improves machine understanding.

### P1 — Sitemap freshness is stale

File: `sitemap.xml`

- Homepage `lastmod` is still `2026-04-01`.
- Several important CRM/form changes happened later.

Why it matters:

- This makes change signaling weaker than it should be.
- BAROWO already has a sitemap, so freshness is low-effort to improve.

Recommended fix:

- Regenerate `sitemap.xml` whenever homepage or article metadata changes.
- Keep `lastmod` in sync with real deploys.

## Medium Priority Findings

### P2 — Missing social preview completeness

Files: homepage and core pages

Missing or incomplete:

- `og:image`
- `twitter:card`
- `twitter:image`

Why it matters:

- BAROWO is very visual.
- Shared links should look premium on Instagram-adjacent, Messenger, WhatsApp and Telegram ecosystems.

### P2 — Video gallery is handled reasonably, but could still be cheaper

File: `index.html`

Good:

- videos are `preload="none"`

Still improvable:

- no poster images
- large video files are still present

Why it matters:

- Posters improve perceived quality and reduce black-frame loading.
- Better compression could help mobile users.

### P2 — Contact/address consistency should be normalized

Files: homepage visible content, schema, Google assets

- The page visibly shows an address and contact block.
- Schema only partially reflects that data.

Recommended fix:

- Make homepage visible NAP and structured data fully consistent.
- Mirror the same details in Google Business Profile.

### P2 — CRM uses hardcoded team and group identifiers

File: `tools/barowo-crm-gas/src/LegacyBot.gs`

- Team IDs, group ID and allowlist are still hardcoded in code.

Why it matters:

- This makes admin changes harder.
- It increases migration risk if the team changes.

Recommended fix:

- Move team config into Script Properties or a dedicated config sheet.

### P2 — CRM reporting logic still uses expensive whole-sheet reads

File: `tools/barowo-crm-gas/src/LegacyBot.gs`

Heavy readers include:

- `/leads`
- `/statystyki`
- dashboard
- reminders
- morning briefing
- daily summary

Why it matters:

- This is one of the main reasons the bot feels slow.

Recommended fix:

- Replace `getDataRange().getValues()` with narrower range reads where possible.
- Cache frequently used summaries.

## Lower Priority Findings

### P3 — `meta keywords` can be removed

File: `index.html`

- It does not help modern Google SEO.
- It does not break anything, but it adds no real value.

### P3 — Multiple visual H1 fragments are acceptable

Files: homepage and some other pages

- Google does not require a single H1.
- This is not a priority SEO bug.

## CRM Logic Audit Summary

### What works conceptually

- Website lead intake into `Lidy`
- Telegram lead cards
- assignment
- notes
- next contact
- calendar add
- Gmail draft generation
- PDF contract generation
- contact sync
- legacy + modern sync boundary

### Main logic risks

1. Silent lock timeout behavior
2. Hardcoded operator/team configuration
3. Draft-created vs offer-sent semantics are still easy to confuse operationally
4. Public website success UX can mask failed submissions
5. Contract and offer flows are tied to the executing Google account

## Recommended Sequence

### Phase 1 — Reliability

1. Keep lead-flow monitor active
2. Fix website form success/error truthfulness
3. Make lock timeouts explicit to users

### Phase 2 — CRM speed

1. Reduce full-sheet reads
2. Cache dashboard and counters
3. Narrow callbacks to targeted row reads only

### Phase 3 — Search/visibility

1. Expand homepage `LocalBusiness` schema
2. Add social preview tags
3. Improve article schema completeness
4. Keep sitemap dates accurate

## References

- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google LocalBusiness structured data: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Google AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Google Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
