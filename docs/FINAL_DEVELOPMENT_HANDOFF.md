# Latest local correction handoff — 28 October 2026

The current UI/account correction is documented in [CRITICAL_UI_FIXES_REPORT.md](CRITICAL_UI_FIXES_REPORT.md), with normal local testing at http://localhost:3091/explore and detailed evidence in `ui-fixes/`. This is a local software/UI handoff only. Owner visual acceptance remains pending; previous broader technical/operating closure limits and real-event NO-GO remain in force. No deployment, real billing or sales is authorized.

# Current local UI correction and Test Lab — October 28, 2026

The owner rejected the prior UI. The new correction and guarded one-entry fictional Test Lab run on http://localhost:3081/test-lab, separate from canonical DB and the preserved 3071 preview. See [UI_CORRECTION_REPORT.md](UI_CORRECTION_REPORT.md), [UI_TEST_LAB_GUIDE.md](UI_TEST_LAB_GUIDE.md), [END_TO_END_OWNER_TEST_RESULTS.md](END_TO_END_OWNER_TEST_RESULTS.md) and [UI_FINAL_ACCEPTANCE_CHECKLIST.md](UI_FINAL_ACCEPTANCE_CHECKLIST.md). Current local regression:356 tests,0 failed;10 original desktop/mobile browser tests;224 responsive executions; TypeScript/schema/optimized build pass. Owner visual acceptance is pending. The earlier operational PARTIAL closure and no-real-event/no-release/no-sales boundaries still apply. This correction creates no production or external-provider authorization.

# Current application UI handoff — October 27, 2026

The local UI redesign following Phase11 is implemented. Current canonical source remains `/Users/parsa/Desktop/EVENT FINDER`; new UI preview is http://localhost:3071/admin/login (authorized admin enters `/explore`) or `/organizer/login` for organizer/staff. The original3061 preview is preserved. See [UI_REDESIGN_REPORT.md](UI_REDESIGN_REPORT.md), [UI_DESIGN_SYSTEM.md](UI_DESIGN_SYSTEM.md), [UI_BEFORE_AFTER.md](UI_BEFORE_AFTER.md) and the independent visual verdict under `docs/ui-redesign/`.

The unchanged353-test suite and10 desktop/mobile browser tests pass. This frontend work preserves Phase11 backend/data/privacy behavior and does not close remaining human/external/physical checklist items or authorize production, real sales or real-event use. Private admin access remains only in the isolated preview's `.local/admin-access.json`. The Phase11 technical/operational handoff follows below as the retained record.

# MixerMates final development handoff

October 27, 2026 · Phase 11 · Asia/Kuala_Lumpur. Read this first in a new development chat, then the current [Phase 11 report](PHASE_11_REPORT.md), [P0 register](FINAL_TECHNICAL_P0_STATUS.md) and [deployment policy](DEPLOYMENT_POLICY.md). The owner authorized local Phase 11 work only. No production deployment/upload/access, release artifact, hosted database/DNS/CDN/environment change, real sales/banking, external messages or public tunnel is permitted. Earlier Phase 4 approval is spent. This handoff is not release permission.

## Product and architecture

MixerMates is an existing Malaysian nightlife/event discovery, organizer registration/ticketing and opt-in social platform. Users are attendees, organizers, administrators and event-scoped entrance staff. Organizer-direct QR is the current payment model: a customer pays the organizer, submits private evidence, an authorized independent human confirms incoming funds, registration/BYOB gates pass, and the shared issuer creates eligible tickets. MixerMates does not hold money, automate refunds, escrow or payouts. A screenshot is never confirmation of funds. Organizer receipts are not platform revenue.

Attendance is private by default and comes from authorized check-in, not purchase. Public discovery obeys applicable account/per-event consent and private-event boundaries. Invitations bind an existing account/event with hashed random secrets, expiry/usage/revocation and persisted grants. Exact location and payment evidence have separate permissions. Safe ticket share previews omit credentials and private details.

Keep Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3, Prisma 6.19, pnpm, bcryptjs, hashed DB sessions, Zod, private file storage, QR libraries, MapLibre and native CSS. No stack/dependency replacement in Phase 11. Read the installed `node_modules/next/dist/docs/` relevant guide before coding; this Next version has breaking conventions. The project is not a Git repository; no remote/CI was created.

| Directory/module | Responsibility |
| --- | --- |
| `app/` | Next pages, protected API adapters, customer routes and shared styles; Coming Soon remains public gate |
| `components/` | Existing discovery/profile/social, seven-step creator/setup, organizer/admin, booking/payment reviews, digital tickets, entrance and operations screens |
| `lib/auth.ts`, `lib/security.ts`, `lib/session-security.ts` | bcrypt, account validation/recovery, hashed session securityVersion/expiry/revocation and DB rate buckets |
| `lib/access-policy.ts`, `lib/site-config.ts`, `lib/event-access.ts`, `lib/media-access.ts` | Fail-closed site/sales access, object scope, private location/media |
| `lib/domain-core.ts` | Serializable transactions, bounded retries, fresh actor/staff permission, event fences, transactional audit/notices |
| `lib/event-management.ts`, `lib/management-api.ts`, `lib/event-config.ts` | Owned draft/tier/question/image/payment configuration and moderation; aggregate cancellation impact |
| `lib/invitations.ts`, `lib/staff-permissions.ts` | Account/event-bound grants and least-privilege current staff assignments |
| `lib/booking-domain.ts`, `lib/payment-foundation.ts` | Canonical inventory/booking/registration/payment/BYOB/issuance/lifecycle rules, private proof and immutable recipient versions/snapshots |
| `lib/payment-risk.ts`, `lib/reconciliation.ts` | Neutral risk indicators, scoped human review/financial filters and private streamed CSV |
| `lib/services.ts`, `lib/entrance.ts`, `lib/guest-list.ts` | Existing quarantined demo services, shared once-only check-in, server guest search/pages and permission-rechecked exports |
| `lib/operations.ts`, `lib/event-operations.ts`, `lib/readiness.ts` | Refund/support/preferences/account oversight, reviewed changes/policy snapshots, separate readiness/operational failures |
| `lib/operational-jobs.ts` | Existing outbox/claim/lease/mock retry, expiry, reminders and explicit eligible issuance recovery; Phase11 adds delivery deadlines |
| `prisma/` and `prisma/mysql/` | SQLite/provider-compatible schemas and historical migration tracks; 41 application models, 42 DB tables including Prisma history |
| `scripts/`, `tests/`, `docs/` | Guarded fictional preparation/recovery/browser/provider tooling, regression suites and dated evidence |
| `public/branding/` | Original official assets and existing optimized identity; preserve byte-for-byte |

Database records include User, Session, UserCapability, Event, EventTicketTier, registration fields/answers in Booking, EventInvitation/InvitationGrant, EventStaff, PaymentDestination/PaymentRecipientVersion, FileUpload/PaymentEvidence/PaymentReview, Ticket/TicketCheckIn/AttendanceRecord, Refund, Notification, Report, EventChange, rate buckets and AdminAuditLog. Original financial/recipient/ticket/attendance history must survive state changes. Fourteen SQLite/nine MySQL migrations are retained; Phase 11 introduces no schema migration.

## Preserved functionality and invariants

Customers have existing registration/login/logout/recovery foundation, account/profile/privacy, authorized discovery/filter/map/save, private invitation and registration, organizer payment evidence/correction, separate status/history, eligible multi-ticket display, QR, private Passport, support/refunds and in-app preferences/notices. Real recovery/delivery email is absent. Coming Soon does not grant unrestricted customer discovery.

Organizers have persistent drafts/create/edit, categories/images/tier/form/access configuration, independent moderation, QR version submission/review/assignment, private invitation/review, independent funds and BYOB gates, reconciliation/risk/export, guest/staff/entrance, reviewed changes/cancellation, readiness/refunds/support/analytics. Admins have account/security/role oversight, organizer/event/payment destination review, audit/support, event-change review and bounded operations/recovery. Staff use event-scoped QR/manual online check-in, ID acknowledgement and duplicate rejection. Existing friends/requests/messages, blocks/reporting, profiles/badges/memories remain; broader social expansion is incomplete.

Never issue a paid ticket before exact original recipient/amount and independent funds plus required registration/BYOB gates. A failed issuer preserves confirmed funds; retry idempotently rather than asking for payment again. Reservation hold/release uses finite deadlines and compare-and-set. Submitted proof holds stock for human review. One ticket admits once, one account/event earns one private attendance record. Wrong-event/used/revoked/cancelled/suspended/ineligible and revoked staff requests fail. No offline synchronization exists. Cancellation/refund does not erase committed attendance or financial history; reporting a transfer and customer acknowledgement do not verify bank settlement.

Notifications use the existing durable inbox/outbox. Mock success is not email. The 10-second deadline is below the 60-second lease; retries retain the idempotency key and safely classify uncertain timeout. Late external side effects still require provider-level idempotency/cancellation. No real adapter or supervisor is implemented. See [operations handover](OPERATIONS_HANDOVER.md).

## Latest source and preservation

Canonical source: `/Users/parsa/Desktop/EVENT FINDER`. It matched all 246 compared Phase10 source/script/test/asset files before work. Sanitized source rollback snapshot: `/Users/parsa/.codex/tmp/mixermates-phase11-20261027/baseline`. Private source/protected hashes and exact runners/logs remain in that scratch root. No Git recovery is assumed. Do not copy an older preview over canonical or copy fixture DB/.env/private credentials into source.

Current review preview: `/Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview` → `http://localhost:3061/organizer/login`; admin `/admin/login`, customer `/my-bookings`. Loopback127.0.0.1 only; public Coming Soon, real sales disabled, demo false, explicit fictional customer adapter. Private admin credentials stay in preview `.local/admin-access.json`. Original Phase10/earlier previews are preserved.

The unchanged 348-test baseline ran in a newly created `/Users/parsa/.codex/tmp/mixermates-phase10-20261027/phase11-baseline` on3062 solely to honor the original hard-coded Phase10 recovery guards. It is fictional and distinct from prior accepted workspaces. Final regression is Phase11 sibling `regression` on3063; builds/provider clients have independent copies. No database was reset to repeat tests.

## Run safely locally

Check3061 is free before starting another server. From preview:

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview
python3 ../run.py preview pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3061
```

The retained private runner pins Node22.23.3/pnpm, loads only that copy's `.env`, clears DB_* and inherited DATABASE_URL/NODE_ENV, asserts its contained audit.db and keeps bootstrap/seed false. It performs no migration/seed. Do not use default scripts binding0.0.0.0 or run a current client against canonical `prisma/dev.db`.

Required safe local names: `DATABASE_URL=file:<owned workspace>/prisma/audit.db`, loopback `APP_ORIGIN`, `SITE_MODE=coming_soon`, `TICKET_SALES_MODE=disabled`, `DEMO_MODE=false`, `LOCAL_DEMO_BOOKING_ENABLED=false`, `ISOLATED_TEST_DATA=true`, `LOCAL_CUSTOMER_TEST_ENABLED=true`, `HOSTINGER_DATABASE_BOOTSTRAP=false`, `HOSTINGER_SEED_DEMO=false`, `NODE_ENV=development`. The regression-only fictional copy uses full_platform/demo flags for retained demo tests; they do not unlock real sales. Clear every DB_* override because those override DATABASE_URL. No invented auth signing secret is needed: session tokens are random and hashed in DB. See [local development](LOCAL_DEVELOPMENT.md).

For a new fictional environment, select the existing Node22 and pnpm paths, then from canonical use `python3 scripts/prepare-local-audit.py --directory <new nonexistent private directory> --port <unused loopback port>`. This offline helper copies sanitized source, creates its own SQLite file, applies migrations/seeds fictional accounts and aligns the actual Halloween draft to unconfirmed/paused. It never imports canonical DB/.env. Read the script first; existing destinations are refused. Phase11's recovery/E2E guards require an exact owned Phase11 direct-child workspace and `.local/phase11-isolated.json` with fictional=true and phase=11; never fabricate this marker to operate on unrelated data. Provision only a fresh fictional admin using `scripts/provision-local-admin.mjs`. Existing `prepare-phase4-fixture.mjs` and `phase11-browser-fixture.mts` create separate fictional event/invitation records; they refuse repeated fixture creation. The legacy E2E fixture filename is a private alias of the Phase11 fixture, so all old browser assertions remain unchanged.

## Tests and recovery

Final regression (start its separate server on3063 first):

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase11-20261027/regression
python3 ../run.py regression pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3063
# In another terminal in the same directory:
python3 ../run.py regression pnpm test
python3 ../run.py regression pnpm typecheck
```

Browser suite with preview3061 already running:

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview
E2E_BASE_URL=http://localhost:3061 python3 ../run.py preview pnpm test:e2e
```

The E2E config requires the matching origin/owned contained DB/marker/disabled sales; it never auto-starts canonical. Traces/screenshots are off. Source-driven `scripts/phase11-browser*`, entrance/accessibility/QR harnesses reuse the existing journeys and mask credentials; they are not replay-safe destructive fixture resets. Preserve completed event/refund/attendance history and use a new fictional environment for a fresh creation journey.

Application regression retains all 348 original tests and adds 5 counted cases (parent plus four focused regressions). Only the original recovery test's workspace guard changes to permit the exact Phase11 namespace; all old assertions remain. SQL harnesses run retained Phase9 tests, existing runtime checks, Phase10 recovery/domain tests and the new Phase11 tests. Use `/Users/parsa/.codex/tmp/mixermates-phase11-20261027/run-sql.py` as reference, not an idempotent command: it refuses existing data directories and uses existing local MySQL8.0.41/MariaDB11.8.9 binaries, new private credentials, allowlisted loopback13306 and dedicated provider clients. It dumps/restores into a fresh schema, compares every table fingerprint/FK and stops daemons in finally. Do not reuse arbitrary DBs. New daemon directories retain the Phase10 parent namespace only to satisfy the unchanged Phase10 SQL-socket guard. No production backup or Hostinger access is used.

Build only in the sibling build/client copy: `python3 ../run.py build production pnpm exec next build --webpack`. Validate both schemas with the correct provider URL; do not regenerate a running SQLite server's client as MySQL. Recovery helper supports only owned Phase10/11 workspaces and new contained destinations; [disaster recovery](DISASTER_RECOVERY_RUNBOOK.md) and [backup tests](BACKUP_RESTORE_TESTS.md) explain fingerprints, FKs, migration history and rollback limits. Do not rerun completed one-shot provider/browser harnesses over existing fixture history.

## Remaining work and future continuation

The official inventory remains 309 stable IDs; new tests or repaired facets are not extra features. Read the final exact counts/report and all 40 individually reviewed technical P0 rows. Broad unresolved software includes all-event/moderation collection pagination, older notification/support/refund/history navigation, complete real customer release/sales-mode integration, provider destination/receipt/callback adapter and production worker supervision/independent alerts. Local payment/registration/issuance security is tested; shared-bank-transfer allocation and real operating evidence remain unresolved. No broad P0 is promoted merely because a bounded repair passed.

Owner decisions: actual organizer/recipient/QR, year/time/venue/capacity/prices/BYOB, refund/reschedule/hold/review/support/retention terms and named operating owners. External: real sender/domain/provider, hosted secrets/logs/backup/restore/monitoring/traffic/proxy/TLS acceptance under new authorization. Physical: iPhone Safari, Android rear-camera/focus/low light, actual ID/door/network and assistive technology. Real Halloween stays DRAFT/UNCONFIRMED/sales paused. No real identity, bank, venue, legal or physical certification is supplied by tests.

Next developer should select a narrow remaining technical scope from the register, preserve the current baseline, keep fictional localhost isolation, add acceptance for the selected gap, update evidence and stable statuses, and stop before any prohibited external operation. [OWNER_ACTION_REQUIRED.md](OWNER_ACTION_REQUIRED.md) is the input queue; [FUTURE_FEATURE_ROADMAP.md](FUTURE_FEATURE_ROADMAP.md) separates unimplemented VIP/gateway/escrow/subscription/social expansion. No production release or real-sales approval is requested by Phase11. Do not automatically start new expansion work.
