# Local validation — 28 October 2026

All application mutation and browser work used owned disposable SQLite workspaces and loopback servers. The canonical project is `/Users/parsa/Desktop/EVENT FINDER`; its original database was not used for test transactions. The working directory has no Git repository; a source-before snapshot is retained privately under `/Users/parsa/.codex/tmp/mixermates-ui-fixes-20261028/source-before`.

| Check | Executed result | Evidence |
|---|---|---|
| Baseline count from actual runner | 356 cases, preserved | Initial execution log retained privately |
| Current automated suite | **358 passed, 0 failed, 0 skipped** | `logs/tests.log` |
| Existing Playwright suite | **10 passed** on desktop/mobile | `logs/e2e.log` |
| TypeScript | pass | `logs/typecheck.log` |
| Prisma schema validation | pass | `logs/prisma.log` |
| Optimized Next.js webpack build | pass | `logs/build.log` |
| Responsive light/dark matrix | **252 checks**, 18 routes × 7 widths × 2 appearances, no overflow/broken visible images/client page errors | `browser-results.json` |
| Interaction/system coverage | **37 checks**, including 14 System-resolution checks across all seven widths, phone notification dismissal, menu dismissal/focus, dialog scroll cleanup and rail keyboard/filter state | `browser-results.json` |
| Personal organizer supplement | **14 checks**, same customer identity at all seven widths in both themes; duplicate panel create action removed | `personal-studio-results.json` |
| Compact entry/icon hover supplement | **7 checks** | `entry-hover-results.json` |
| Normal one-login owner journey | **19 checks** | `journey-results.json` |
| Additional eligible booking scenarios | **6 checks**, plus the paid journey above | `scenario-results.json` |
| Refund/security supplement | **6 checks** | `refund-results.json` |
| Mobile signup/permission supplement | **2 checks** | `signup-results.json` |
| Optimized runtime | Two bounded local Chromium scroll samples; p95 ≈16.7–16.8ms, observed CLS 0, no page errors | `optimized-results.json` |
| Production-mode Lab denial | Page, state, activation and workspace endpoints all **404**, even with Lab enable flag present | `optimized-results.json` |
| Protected source/data/assets | **38 checks unchanged** | `preservation-results.json` |

Widths: **320, 375, 390, 430, 768, 1024, 1440px**. Routes: discovery, event, checkout, profile, tickets, organizer, staff, payment review, event operations, admin overview/events/accounts, notifications, creator, scanner, payment methods, community and ticket history. Geometry/image checks are separate from actual rendered review; contact sheets and page captures were inspected in both appearances on phone and desktop.

The owner journey signs in once, registers through normal screens, uploads private fictional evidence, confirms exact fictional funds through a distinct finance actor, approves registration through a distinct administrator, decodes the actual private rendered QR, admits once and rejects duplication, checks profile attendance, retains the same customer ID with organizer capability, creates/saves/submits an event, independently publishes it, edits and re-reviews it, issues a free RSVP ticket, redeems a real identity-bound private invitation, and opens event-scoped payments/scanner tools. A TEST plan activation was exercised, then retained and idempotently retried; it changed neither role nor verification. No browser success flag grants authority.

The refund journey uses normal ticket-history and administrative forms through request → approval/cancellation → awaiting transfer → fictional transfer report → customer receipt acknowledgement, and verifies revoked admission. It exposed and fixed a customer-history scope bug after organizer activation. A new DB-backed test protects that case. The other added test distinguishes approved fictional free RSVP from paid/mixed-price verification requirements.

The first suite execution lacked the required isolated recovery marker and allowed separate test files to interfere through their shared notification DB. The marker was corrected and `pnpm test` now serializes files; concurrency tests *within* files remain intact. No existing valid cases were removed or relaxed. Browser harness selectors/readiness were corrected as the normal UI was exercised; final reports above contain actual completed checks, not planned checks.

Re-run browser helpers from the verified Lab via its private `run-preview.py` environment wrapper, e.g. `node --import tsx scripts/ui-fixes-browser.mjs`. Domain/HTTP tests must use their separate owned full-platform/access regression fixtures. Never run DB tests against the canonical `.env`/database. No cloud, hosting or production command is required.

## Limits and authority

No physical-device camera/door exercise or field performance claim. No fresh MySQL/MariaDB parity run: this Lab adapter deliberately rejects those providers, and the schema/migrations are unchanged. No real billing provider, gateway callback, subscription charge, transfer or external notification transport was connected. Pricing, real-world checks, release permission and owner visual acceptance remain separate. Actual Halloween remains draft/unconfirmed/paused in the preserved canonical data; real-event status remains NO-GO.

This closes the requested local software correction at its executed scope; it does not claim all historical Phase11 operating obligations or production acceptance are complete.
