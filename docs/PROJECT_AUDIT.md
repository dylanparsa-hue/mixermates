> Phase 2 update (October 20, 2026): the findings below are the historical Phase 0 observations, retained for traceability. AUD-01 fixed in local transaction-safe admission; AUD-02 real-model eligibility protected and demos quarantined; AUD-03 private backend invitation boundary implemented (customer entry UI pending); AUD-04 fixture corrected only where confirmed, full workflow/unknowns pending; AUD-05 optional browser test debt unchanged; AUD-06 local recovery backend tested, production mail still blocked. Current evidence: PHASE_2_REPORT.md and PHASE_2_SECURITY_TESTS.md. No production fixes are claimed.

# MixerMates project audit

October 19, 2026 · Phase 0 · Asia/Kuala_Lumpur. Verdict: **substantial working demo foundation; not ready for real ticket payments**. No application code, schema, logo, production configuration or production data was changed in this audit. Findings below distinguish reproduced behavior, code evidence and unverified deployment assumptions.

## 1. Architecture and stack

| Area | Observed implementation |
| --- | --- |
| Framework | Next.js 16.4.2 App Router, React 19.3.1, TypeScript 5.9.3 |
| Frontend | Client-composed application in components/vibey.tsx; catch-all app/[[...slug]]/page.tsx; feature components; native CSS; Manrope/Oxanium local fonts |
| Backend | Node.js route handler app/api/[...path]/route.ts, approximately 1,330 lines; services in lib/services.ts; Zod validation |
| Database | Local SQLite prisma/dev.db; separate MySQL schema/migrations for managed Hostinger runtime |
| ORM | Prisma 6.19.0; generated client; separate migrations per database provider |
| Authentication | Custom bcryptjs password authentication, random cookie session token, SHA-256 database session identifier; no external auth library |
| Uploads | FileUpload database bytes; public token media route; private receipts only through authorized booking endpoint; legacy filesystem fallback |
| Tickets | qrcode generation, JsBarcode visual reference; html5-qrcode camera reader; 32-byte random entry tokens |
| Map | Lazy-imported MapLibre GL; OpenFreeMap light/dark style; approximate-only private location intended |
| UI system | Semantic light/dark CSS tokens, reusable official BrandLogo/BrandSymbol, Light/Dark/System with pre-paint persisted preference |
| Tests | Node test runner with tsx; integration HTTP tests, rules, database URL and theme tests; optional Playwright specs |
| Packaging | pnpm lockfile; standalone Next build; sanitized source ZIP helper; Hostinger build/runtime scripts |
| Hosting | Existing docs describe Hostinger Node 22 + MySQL; prior deployment evidence is historical, not reverified in this local-only phase |
| Version control | No .git directory, no observed Git remote or CI workflow; no automatic Git deployment configured in this folder |

## 2. Structure

app/ owns layout, CSS, loading/error, catch-all pages, API and media route. components/ contains explore, event/booking, create-event, organizer, admin, tickets, digital-ticket, profile, friends, map, auth, brand/theme and interaction primitives. lib/ contains authentication, database URL/client, booking/review/check-in/refund services, privacy projections and Hostinger bootstrap. prisma/ has SQLite schema/seven migrations, MySQL schema/two migrations and fictional seeds. tests/ has four Node suite files and one Playwright discovery spec. scripts/ contains dev, brand preparation and hosting packaging/build helpers. public/ has locally hosted photos/fonts, processed brand artwork and original references. docs/ has historical verification and new Phase 0 documents.

## Official assets — present, no asset blocker

User originals: `/Users/parsa/Desktop/mixermateslogo.png` (3000×3000 alpha PNG symbol) and `/Users/parsa/Desktop/MixerMates_nightlife_platform_lo…_2K_20261018195728.jpg` (2048×2048 full-logo JPG). Exact preserved copies: `/Users/parsa/Desktop/EVENT FINDER/public/branding/original/mixermates-symbol-original.png` and `/Users/parsa/Desktop/EVENT FINDER/public/branding/original/mixermates-logo-original.jpg`. Hashes match the desktop originals. Current production-ready variants remain in `/Users/parsa/Desktop/EVENT FINDER/public/branding/processed/`; BrandLogo/BrandSymbol and theme tokens remain unchanged. PNG variants were prepared in the previous brand phase; no image processing occurred in Phase 0.

## 3. Local environment and database inspection

Original SQLite file: `/Users/parsa/Desktop/EVENT FINDER/prisma/dev.db`. Read-only integrity_check returned **ok**. Initial counts: 8 users, 8 events, 15 tiers, 5 registration fields, 2 bookings, 2 payments, 1 ticket, 1 check-in, 1 attendance record, 4 clubs, 6 memberships and 7 applied migrations. No user names, emails, passwords or tokens were copied into audit output. Other tables were inspected by schema/count only. The original DB was not used for mutation tests.

Isolated workspace: `/Users/parsa/.codex/tmp/mixermates-phase0-20261019/workspace`, fresh `prisma/audit.db` with existing SQLite migrations and fictional seeds, no production credentials or private uploads. Audit server binds **127.0.0.1:3001**. Original port 3000 server remains unchanged. No active Cloudflare tunnel was found. Dependencies installed successfully from the existing pnpm cache with frozen lockfile; no upgrades. The first attempt used a node_modules symlink that Turbopack rejected because it was outside the workspace root. A real isolated install resolved this without source edits. The local Prisma engine initially failed to create a nonexistent DB file; creating an empty SQLite file before migrate deploy resolved it. Both setup details are recorded in LOCAL_DEVELOPMENT.md.

Current root .env keys (values not disclosed): DATABASE_URL (local SQLite), DEMO_MODE, PLATFORM_FEE_BPS, APP_ORIGIN. .env.example adds NEXT_PUBLIC_MAP_STYLE_URL. Code also recognizes DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, HOSTINGER_DATABASE_BOOTSTRAP, HOSTINGER_SEED_DEMO, NODE_ENV, NEXT_PHASE, NEXT_RUNTIME, TEST_BASE_URL. DB_* credentials can override DATABASE_URL in lib/database-url.ts; tests must explicitly clear them. Existing .env.example's PostgreSQL comment is stale relative to the actual MySQL deployment schema.

## 4. Verified local foundations

The full existing suite passed **36/36** in the isolated environment. TypeScript passed. A fresh optimized Next webpack build passed locally; no deployment command was used. The suite verifies password registration/login/logout and hashing; admin denial and hostile-origin rejection; event ownership and edit locking; age restriction; private upload ownership/read access; idempotent booking, failed-payment stock behavior, required registration answers, approval-only issuance for approval-required demo events; unique QR/private ticket ownership; simultaneous duplicate-scan rejection; attendance stamps after check-in only; stock release/review repetition; refunds revoking demo tickets; profile/contact/attendance privacy; profile website validation; private club membership; friend requests/messages/blocking; promotion review; notification read state; saves; and simulated settlement. Theme/URL/rules suites verify their respective pure logic.

HTTP probes confirmed main local routes respond 200 (they render a client shell), while anonymous /api/admin and /api/tickets return 401. A 200 page response alone is not proof of server-side page gating. Anonymous event queries work; privateVenue is removed but private event listings/coordinates are returned. Additional search probes and rendered views are in the evidence register. Focused role probes also verified anonymous organizer denial, an unrelated attendee’s empty organizer scope, hidden pending guest records for staff, redacted staff payment/receipt/answers/email fields, and in-app friend-request/message notices. Physical QR camera scanning, MySQL concurrency, email delivery, full browser E2E and real payment settlement were **not** certified.

## 5. Feature status by product area

| Feature | Current classification | Evidence / practical limit |
| --- | --- | --- |
| Homepage/discovery | IN PROGRESS | Renders desktop/phone, queries/filter code works; no public launch gate |
| Event listing/details | IN PROGRESS | APIs/fixtures verified; private event visibility not invitation-gated |
| Event creation/edit | COMPLETED AND TESTED for existing demo scope | Ownership, future dates, tiers/capacity validation and edit lock exercised; real publishing review missing |
| Ticket booking | IN PROGRESS | Demo transaction/idempotency works; incompatible with real manual payment |
| Organizer payment QR uploads | NOT STARTED | No payment-QR model, ownership/version/review endpoint or checkout display |
| Receipt uploads | IN PROGRESS | Private owner-bound JPG/PNG works; optional, 4 MB limit; no real review state |
| Registration/login | COMPLETED AND TESTED for password/session baseline | No production email recovery or initial admin provisioning workflow |
| Organizer dashboard | IN PROGRESS | Event/booking/review/scan/reporting foundation; money figures simulated, staff management incomplete |
| Admin dashboard | IN PROGRESS | Server ADMIN check and existing review actions tested; no payment QR review or controlled preview access |
| Profiles/social | IN PROGRESS overall | Many privacy/friend/message foundations tested; no complete consent/abuse/mobile accessibility certification |
| QR generation | COMPLETED AND TESTED for token generation/owner access | Real-money eligibility still blocked by payment model |
| Scanning | IN PROGRESS | Duplicate race passes; suspended-event admission bug reproduced; physical camera not tested |
| Notifications | IN PROGRESS | Durable in-app booking/social records work; no mail/scheduled delivery, incomplete preference enforcement |
| Light/dark themes | COMPLETED AND TESTED for current desktop/phone presentation | Existing theme tests and rendered review; not a WCAG/physical-device certification |
| Coming Soon / independent sales mode | NOT STARTED | No SITE_MODE/TICKET_SALES_MODE policy in code |
| Real Halloween workflow | BLOCKED | Source decisions and multiple backend changes required; current fixture is fictional |

## 6. Confirmed bugs and incompatible behavior

### AUD-01 — P0: suspended events still admit existing tickets

Location: `lib/services.ts:229` (checkIn), particularly eligibility at :255; admin suspension in `app/api/[...path]/route.ts:1294` area. Reproduced entirely on the isolated DB: create free fictional event → book valid ticket → admin sets event SUSPENDED → organizer submits identityConfirmed scan → **200 CHECKED_IN**. checkIn verifies ownership, ticket/booking/payment/age, but not event status. Required fix later: define allowed event lifecycle/entry window and reject suspended/cancelled events atomically. This is a confirmed backend defect, not merely absent UI.

### AUD-02 — P0 launch mismatch: paid demo tickets can be issued without funds evidence

Location: `app/api/[...path]/route.ts:655`, `lib/services.ts:124–149`. Reproduction: local attendee books paid NEON tier with rules=yes, no receipt and no paymentOutcome. Response **200 APPROVED**, paymentStatus SUCCEEDED and one active ticket. Current demo behavior is intentional simulation, but it cannot serve real ticket sales. Receipt is optional; a non-FAILED input falls through to success; approval-required review checks a synthetic SUCCEEDED flag. Required next phases: independent payment states, approved recipient snapshot and manual funds confirmation before issuance. Do not “fix” by pretending a receipt proves settlement.

### AUD-03 — P0 privacy/access gap: PRIVATE is a label, not an invitation boundary

Location: `app/api/[...path]/route.ts:107–162`, `lib/services.ts:40`, `components/map.tsx:48–61`. Anonymous events listing includes the private Halloween fixture; details return 200 and lat/long. Booking checks age/status/fields but no invitation credential. privateVenue string is correctly hidden, but API discovery and map exposure are not authorized event-link access. A customer link and scoped invitation grant are absent. Required: server policy for private listing/detail/media/registration and location resolution; no precise fake/private coordinate leakage.

### AUD-04 — P0 requirement mismatch: Halloween registration contract differs

Location: `prisma/seed.ts:225–252`, `components/event.tsx:541–557`, API upload :474–492. Instagram is optional and inviter required; source specifies the opposite. Age is derived from profile DOB rather than the source event's required age answer. Proof is optional/4 MB rather than required one file/10 MB. Seeded venue, time, capacity and VIP surcharge are fictional. Entry-option text has no definitive BYOB pricing rules. These are known fixture/requirement mismatches; do not overwrite production from the source form without organizer decisions.

### AUD-05 — P1 test debt: Playwright discovery spec has stale selectors

Location: `tests/e2e/discovery.spec.ts:5` versus `components/explore.tsx:146`. Spec expects h1 with trailing ✦; current rendered h1 is “Find your vibe. Find your people.” It also assumes a specific old article count. Code/AX mismatch confirmed, browser suite not executed. Fix fixtures/selectors in later QA; do not report optional E2E as passing.

### AUD-06 — P0 missing recovery delivery

Location: `app/api/[...path]/route.ts:583–611`, `components/auth.tsx:29–42`. Token generation/hash/expiry/reset logic exists, but production response explicitly says email delivery is not connected; UI has no usable delivered-token route. Password-recovery journey is incomplete. Do not send test emails or install a gateway in Phase 0.

## 7. Other launch risks and missing work

- No Coming Soon server policy, independent sales mode, scoped/revocable invitations, default-deny preview gate or approved-link-only booking experience.
- No organizer QR/recipient model, version history, admin approval, independent funds-review records, duplicate transfer reconciliation, receipt correction queue or external-refund proof. Existing demo payout/refund and fee reporting must never be presented as actual money movement.
- Pending bookings reserve stock indefinitely. Tier atomic update protects the tested SQLite case, but concurrent MySQL last-seat/retry isolation and aggregate capacity invariants need targeted testing. Sale windows exist in schema/service but are not fully configurable through event editor APIs.
- Event creation defaults PUBLISHED; verified adults can publish paid demo events without a separate per-event admin approval. Verification is a note review/demo flag, not completed identity/legitimacy verification. Initial privileged users and real organizer verification require secure operating procedures.
- Coarse ADMIN/organizer ownership/EventStaff permissions exist; staff can receive approved ticket tokens in their event projection. Formal staff capability assignment/removal and least-privilege review are missing.
- Rate limiting uses process-local Map and trusts forwarded IP; restart/multi-instance behavior and memory bounds are unverified. Origin checks reject supplied hostile origins but allow missing Origin; distributed abuse controls, CSRF threat model, cookie/session tests and administrative controls need security review.
- Uploads check JPEG/PNG magic bytes but do not decode/re-encode, strip metadata, constrain pixel dimensions or scan content. Existing tests deliberately pass a truncated magic-header image, proving only signature checks. Request-body checks rely partly on Content-Length; hosting/runtime behavior needs size/streaming tests before a 10 MB change.
- Attendance discovery uses per-event public+discoverable flags; public profile separately requires attendancePublic. Consent semantics/revocation should be clarified and tested across both paths, particularly after a global setting change. Treat this as review-needed, not a proven unauthorized leak.
- No backup schedule/restore rehearsal, proven rollback, error aggregation/alerting, mail queue, transaction failure monitoring, outage admissions procedure or local MySQL parity suite.
- One large catch-all API file, widespread any types, string states, JSON answers, duplicated SQLite/MySQL schemas and seven layered style files raise maintenance/test costs. Refactor incrementally after behavior is locked; no backend rewrite in Phase 0.
- Existing integration tests accept arbitrary TEST_BASE_URL and import DB configuration independently. They can be pointed at the wrong server/database by mistake. Use the documented isolated loopback-only launcher; a future test harness should fail closed itself.
- Existing dev scripts bind 0.0.0.0; current servers bind loopback, but fresh starts must use the safe command. No active cloudflared process was found. Historical SHARING instructions are superseded by DEPLOYMENT_POLICY.md.

## 8. Interface audit

Implementation integrity: **pass for recognizable product identity; incomplete for transactional launch claims**. Official logo/tokens, photographic discovery and quiet data surfaces are coherent; the mechanical Impeccable source detector returned `[]` for auth/event/organizer/admin/shared files. That result does not audit authorization or certify accessibility.

| Dimension | Provisional score / 4 | Evidence and limit |
| --- | ---: | --- |
| Accessibility | 2 | Native labels, dialog focus trap, role alerts and focus colors exist; no skip link, incomplete field-specific error focus and no screen-reader audit |
| Performance | 2 | Local fonts, lazy event imagery/map import; broad client imports, no measured load budget/traffic test |
| Theming | 3 | Shared two-theme tokens, persistence and supplied logos; raw per-user/demo colors and special ticket roles need continued review |
| Responsive design | 3 | Desktop and 393×852 emulated phone discovery reviewed, five-item bottom nav; no physical touch/camera/text-zoom certification |
| Implementation integrity | 3 | Coherent brand and detector clean; remaining demo claims must not be treated as verified commercial state |
| Total | 13/20 | Provisional technical UI assessment; not legal/WCAG certification |

Concrete review locations, following the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md):

- `components/shared.tsx:282` — event image has lazy loading but no intrinsic width/height; reserve aspect ratio/intrinsic dimensions consistently. P2 performance; later optimize.
- `components/explore.tsx:189` — feature image lacks intrinsic dimensions. P2 performance.
- `components/auth.tsx:151` — validation alert is global; field association and first-error focus are incomplete. P1 accessibility/forms; later harden.
- `components/vibey.tsx:97` — no skip-to-main link found in shared navigation. P2 keyboard efficiency.
- `components/explore.tsx:38` — filters live in component state, not a shareable URL. P2 navigation; preserve search on back/deep link later.

Current screenshots in docs/phase0/screenshots/ are local-only. Console showed React development/HMR information and browser “issues”, with no visible app error in the reviewed discovery viewport. Full screen reader, 200% text zoom, every dashboard state, Safari/Android and actual touch/camera tests remain pending. No UI fixes were made.

## 9. Database migration plan for later phases — not executed

Preserve existing rows. Add reversible migrations to **both** schema tracks with a plan for one authoritative schema evolution process. Proposed domains: role/capability grants and scoped invitations; public/sales policy; organizer payment profile, immutable QR versions and admin review history; booking payment/recipient/price snapshots; payment review/actions/evidence fingerprints and refund requests; registration decisions/BYOB review; finite reservation expiry; ticket environment/issuance references/revocation and event lifecycle; durable notification/outbox; immutable audit records. Backfill existing payments explicitly as DEMO, never CONFIRMED real transfers. Do not create real tickets from demo approvals. Rehearse migration/rollback and MySQL concurrency locally before any eventual approved release.

## 10. Recommended strategy and deadline assessment

Keep the current stack. Reuse authentication, event forms/tier inventory, private files, organizer review UI, ticket rendering, random QR tokens, check-in transaction and social privacy tests. Implement server access gates first, then additive manual-payment/state models and review screens. Resolve Halloween decisions in parallel with coding in future phases, not by guessing. Repair suspended-event admission before any real use. End with a full local MySQL-capable, customer-to-door acceptance rehearsal and owner approval.

See PHASE_PLAN.md for dependency order and honest effort ranges. The October 20 night target is **high risk**; current 36-test success proves demo foundations, not the requested payment/access launch. Do not claim a completion percentage from mixed business/future feature counts. If P0 gates or owner decisions fail, remain Coming Soon and do not accept real payments.
