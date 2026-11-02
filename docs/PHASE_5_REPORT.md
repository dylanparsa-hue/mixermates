# MIXERMATES — PHASE 5 REPORT

October 26, 2026 · Asia/Kuala_Lumpur. Local fictional acceptance only.

## 1. Overall status

**Completed locally.** Digital ticket presentation, My Tickets, entrance operations, camera/manual validation, staff scope, guest search/export and attendance reporting extend the existing application. Critical local admission/security checks pass. Physical phone/focus/lighting, Safari and real-door connectivity remain **NEEDS VERIFICATION**, as permitted by the Phase 5 brief; they are not represented as completed. No Phase 6 work or deployment occurred.

## 2. Digital tickets

Existing official logos, event artwork, Manrope/Oxanium and white scanning stock are retained. Preset accents personalize tickets. Event/title/organizer, holder, tier, authorized location, schedule, reference and state remain readable. The functional QR leads secondary details and opens in a native full-screen dialog with focus/Escape handling. Private and sanitized share SVGs remain authenticated. Used, revoked, cancelled, refunded or otherwise ineligible tickets expose no active-looking QR/credential. The legacy endpoint was hardened to match the customer adapter; no ticket model/token replacement was introduced.

## 3. My Tickets

Both existing account and scoped customer surfaces organize Upcoming, Past and Cancelled bookings. Each owned ticket has an individual control; two-ticket bookings retain distinct opaque tokens. Booking details/review history remain available. Customer refresh/reopen reflects persisted status; closing a ticket refreshes the owned list. No public customer discovery or real-sales access was opened.

## 4. QR scanner

The existing html5-qrcode library now operates in the event entrance component: preview the holder/event/tier, check ID when applicable, then separately confirm admission. Camera permission errors provide recovery, devices can be selected, torch is capability-gated, and camera resources stop after recognition, hidden tab or exit. A request lock suppresses continuous-frame submissions. Real local Chrome decoded a synthetic camera stream and completed admission; this is not physical-phone certification.

## 5. Manual check-in

Authorized staff search holder, ticket or booking references, review an eligible ticket and confirm the applicable ID check. The same existing serializable check-in service records MANUAL, staff, time and ticket; it rejects duplicates. Guest-list and check-in capabilities are both required for selection by ticket reference. The private-code fallback remains available to scanning staff.

## 6. Staff management

Existing Staff UI and assignment service are reused. Owner chooses an existing username/event and independent guest/check-in/finance/registration/location capabilities. Browser assignment and revocation were exercised; a freshly authenticated staff session was refused after revocation. Ordinary, guest-only, scanner-only, self-escalation and cross-event cases are covered. Owners see recent staff entrance activity; scanner-only users gain no finance access.

## 7. Guest list

Server-scoped holder/tier/registration/ticket/arrival/time/method data supports name/ticket/booking search, arrival filters and every configured tier. Presentation pages contain at most 50 rows. Owner/admin CSVs are generated on the server, omit unnecessary financial/contact/private fields and QR tokens, escape formula injection including leading whitespace, and record an export audit. Exports are private snapshots, not offline admission authority.

## 8. Entrance dashboard

Existing `/organizer?tab=Entrance&event=<id>` routing is reused. The selected event/date/state stays visible. Stored registrations, confirmed bookings, issued tickets, expected eligible-or-arrived tickets, checked-in/not-arrived counts, rejected Phase 5 attempts, last admission, tier breakdown, percentage and recent arrivals come from database records. No fictional display counts are hardcoded. Actions refresh counters immediately; visible pages refresh every 30 seconds and on return. Other devices can explicitly refresh. Inactive event eligibility changes the currently eligible expected/unarrived count; historical admission records remain.

## 9. Ticket security

Opaque credentials, ticket ownership, no-store exports, event/staff capability checks and existing eligibility remain authoritative. The shared transaction rechecks account, event lifecycle, booking/payment/registration eligibility and ticket state; the Phase 5 admission path also rechecks applicable ID acknowledgement inside it. Ticket claim/check-in/attendance/audit writes remain atomic. List responses no longer give organizer/staff raw QR tokens. Rejection audits contain action/reason/event identifiers, never raw admission tokens. Demo records additionally require a matching isolated demo event.

## 10. Event Passport

Purchase, proof and approval grant no attendance. Successful check-in creates one user/event attendance record, preserves default private visibility and updates eligible existing badges. Multiple admitted tickets do not duplicate an event stamp. A separate real-browser profile journey verified no attended event before admission and the event visible after a server-confirmed check-in, with the attendance row still private. Existing per-event/public-consent/private-event regression remains intact. No reversal endpoint or identity-document database was added.

## 11. Halloween rehearsal

Reused the separate Phase 4 fictional Halloween event in a new isolated preview. Fictional recipient/evidence, independently confirmed fictional amount and separate registration approval issued two TEST tickets. Browser customer access/private-safe exports → staff synthetic-camera preview → 18+ acknowledgement → admission → duplicate refusal → second-ticket manual admission → filtered two-arrival list passed. Owner assignment/revocation passed. SQLite/MySQL suspension/revocation checks passed. The actual `halloween` draft remains DRAFT/UNCONFIRMED with sales paused; root original DB remains unchanged. No real money or actual admission was involved.

## 12. Mobile testing

**Browser:** 70 measured/captured combinations across 320, 375, 390, 430, 768, 1024 and 1440 px; light/dark; active ticket, used ticket, My Tickets, staff entrance and organizer entrance. Zero document overflows, broken images or page errors. Seven additional full-screen QR widths passed viewport/quiet-zone fit and Escape-return checks; success and duplicate states were separately captured. A fresh visual review requested human-readable MYT duplicate time; the fix was recaptured and scored resolved with disposition **ship**, scoped to that fix.

**Physical:** no real phone, lens/focus/lighting, Safari or field-network verification. These remain NEEDS VERIFICATION with owner testing instructions in TICKET_SCANNER_TESTS.md. No public tunnel was opened.

## 13. Automated tests

**Total 223; passed 223; failed 0; skipped 0; cancelled 0.** All 200 prior counted tests remain, plus 23 Phase 5 counted cases. Eight separate disposable-MySQL checks passed; they are not added to the 223 regression denominator. Physical-device verification is outside that executed total. Evidence: phase5/tests.log, typecheck.log and mysql-results.json.

A test-fixture issue was corrected: the access-suite session helper now copies the current persisted securityVersion rather than assuming zero after staff assignment. Valid-session assertions and revocation checks were retained. Earlier missing local test-adapter flags and wrapped-select harness selectors were corrected; failed exploratory runs were not reported as acceptance.

## 14. Concurrency

SQLite and fresh MySQL 8.0.41 passed QR/QR, QR/manual, repeated-request, revoke/scan, suspend/scan, unique-attendance and shared-counter cases. Exactly one same-ticket admission commits. Revocation/suspension races accept a valid earlier committed admission and reject subsequent ineligible requests; they cannot retroactively erase a committed admission. Manual and QR share the same claim transaction. No offline duplicate-prevention claim is made.

## 15. Database

Eleven existing SQLite migrations in each new isolated fixture; integrity `ok`, zero foreign-key violations. No Phase 5 schema change or migration was required. A fresh empty MySQL schema on loopback port 13306 applied all six existing provider migrations and passed eight runtime checks. Both schemas validate. MySQL's fresh data directory was created under the Phase 5 directory; the old MariaDB restoration directory and production/customer backups were not used. Phase 4 MariaDB evidence is historical; MariaDB was not rerun here.

## 16. Build results

`pnpm typecheck`, `pnpm test`, `pnpm exec prisma validate` and optimized `pnpm exec next build --webpack` pass. Separate SQLite and MySQL generated-client builds pass with Node 22.23.3 and existing dependency versions. Development started with the bundled Node 24 runtime, then both loopback servers were restarted on Node 22 for final regression; browser captures precede that runtime-only restart. No package upgrades were made. Existing Prisma package-configuration deprecation warnings are unchanged.

## 17. Feature checklist

**309 total: 74 completed and tested; 159 incomplete (117 in progress, 28 not started, 14 needing verification); 33 blocked; 43 deferred. P0: 49 complete, 86 remaining.** `phase5/remaining-p0.md` lists those remaining IDs. The stale Markdown inventory was first reconciled to Phase 4's accepted JSON (67 completed, rather than its older 57-row snapshot). Seven local facets newly complete: C-009, D-019, D-020, H-011, H-012, H-014, H-015. G-018 was already complete and has stronger evidence. D-012/H-013 remain partial pending physical camera verification. Counts describe product facets, not a launch percentage.

## 18. Important files modified

New: lib/entrance.ts, components/entrance.tsx, app/styles/entrance.css, tests/phase5.test.ts and local fixture/browser/MySQL harnesses. Extended: existing API/access policy, check-in service/eligibility, customer ticket/export routes, digital ticket, My Tickets, customer history, organizer integration and nested-dialog Escape behavior. No new ticket/payment/check-in model or parallel state machine. `phase5/source-comparison.json` identifies changed application files. Required documentation and evidence live under docs/phase5 and the four new Phase 5 guides/reports. All 16 protected initial DB/brand hashes match.

## 19. Local preview

Preview: **http://localhost:3001/organizer/login**. Entrance after authorized login: `http://localhost:3001/organizer?tab=Entrance&event=halloween-phase4-test`. Customer: `http://localhost:3001/my-bookings`. Anonymous public view remains Coming Soon. Canonical source: `/Users/parsa/Desktop/EVENT FINDER`; preview: `/Users/parsa/.codex/tmp/mixermates-phase5-20261026/preview`; regression: sibling `regression`; builds: `build` and `mysql-workspace`. Source/preview application code matches. Restart instructions and explicit isolated DB settings are in LOCAL_DEVELOPMENT.md. No production credentials are needed. Staff is deliberately revoked at the end of acceptance; owner must reassign the fictional account before another scanner rehearsal.

## 20. Production safety

**No production deployment was performed.**

**No production database was modified.**

**Real ticket sales remain disabled.**

No Hostinger upload/release, hosting/DNS/environment/CDN change, production migration, auto-deploy push, real customer access or public tunnel occurred. Only fictional disposable databases and loopback servers were used. The Phase 4 deployment authorization was not reused.

## 21. Remaining issues

Physical phone/lighting/Safari/field connectivity require verification. Synchronized offline admission, dynamic anti-screenshot credentials, PNG/PDF/Wallet exports and audited check-in reversal were not added. Existing authenticated SVG images remain supported. Actual event facts, real recipient/identity, policies, notification delivery/support/retention and release authorization remain owner/operational gates. Ten warm local read samples measured entrance responses at 11.7–15.9 ms (median 12.9 ms), used-ticket responses at 12.1–23.5 ms (median 12.8 ms), and one My Tickets heading load at 294 ms. These Chrome/Node 22 development measurements use only the tiny fictional fixture and are not a real-door SLA. Raw samples are in phase5/performance.json; camera recognition timing was not measured. No known failing critical local admission/security check remains.

## 22. Next phase

Stop after Phase 5. Phase 6 requires a separate owner brief defining its scope against the already completed foundation; do not repeat the obsolete historical phase numbering. Carry forward the physical-device and operating decisions where relevant. No deployment, sales activation or production test is authorized by this report.
