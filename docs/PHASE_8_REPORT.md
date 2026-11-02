# MIXERMATES — PHASE 8 REPORT

October 27, 2026 · Asia/Kuala_Lumpur · localhost only.

## SIMPLE SUMMARY FOR THE OWNER

**WHAT WE FINISHED**

- Fixed 12 local security, reliability and mobile defects in the existing app.
- Strengthened login sessions, private location protection, file checks and job recovery.
- Reduced 2,000-attendee entrance loading from 2,021 database queries to 22.
- Rehearsed customer-to-door, event changes, cancellation/refund and ticket recovery with fictional data.
- Preserved the existing branding, payment model, database history and all prior counted tests.

**BUGS WE FIXED**

Hidden door instructions and venue search could reveal protected location information. Login could create a new session after the password it checked had changed. Legacy request/image validation was too permissive. Reminder jobs could starve later bookings or abort during an event change. Expired final leases lacked scoped, audited failure handling. The phone ID checkbox squeezed its label vertically. Entrance loading repeated one database query per guest. The local worker CLI still targeted only Phase 7.

**WHAT'S STILL MISSING**

Physical phone/Safari/camera/door testing; real event, organizer, recipient, policy and support decisions; real email/SMS/push; supervised production workers/alerts/backups and broader fraud/throughput acceptance. Real sales remain disabled. These are not completed by fictional approvals.

**TEST RESULTS**

**302 automated tests passed; 0 failed, skipped or cancelled.** All 272 prior counted cases remain. Separately, 21 MySQL checks and 21 MariaDB checks passed. Browser journeys, 294 responsive/theme measurements, seven full-screen QR checks, 27 browser authorization/cache checks, TypeScript, both schema validations and both provider builds passed.

**WHAT'S NEXT**

Recommend an owner-scoped Phase 9 for remaining operating/policy/provider/physical acceptance and the selected reconciliation/large-list backlog. Phase 9 was not started. A future release still requires fresh explicit authorization.

## 1. Overall phase status

**Completed for the feasible, targeted local Phase 8 scope. Real-event and production readiness remain incomplete.** All 12 selected issues are fixed and verified. There is no known unresolved high-severity defect from the selected executed checks. This is not a full penetration test, regulatory certification or approval to sell tickets.

Canonical source `/Users/parsa/Desktop/EVENT FINDER` matched the Phase 7 preview before changes. The directory is not a Git repository. A local source snapshot and hashes were preserved at `/Users/parsa/.codex/tmp/mixermates-phase8-20261027/baseline`; no remote or automatic deployment was introduced. New previews/tests use fresh fictional databases, never the original canonical database.

## 2. Critical bugs identified

PHASE_8_ISSUE_REGISTER.md records existing feature IDs, severity, affected function, reproduction, expected result, required fix, verification and status for all 12 issues. Five are P0 within this targeted review: private instructions, venue-search inference, stale password/session binding, unbounded streamed bodies and whole-job abort on an event lifecycle race. Seven P1 issues cover raster validation, error cache headers, reminder starvation, final-lease visibility/scope, entrance queries, mobile ID layout and the local CLI.

The baseline replay actually exposed private instructions, produced only 100 of 105 reminders after three runs, swept an unrelated final lease and recorded zero final-lease failure audits. Baseline query measurement recorded 2,021 queries at 2,000 attendees. Other reproductions are documented code paths and new negative/functional tests. Evidence: `phase8/baseline-reproductions.json`, `performance-before.json`, `tests.log`.

## 3. Critical bugs fixed

General event responses now withhold entry instructions without location permission. Venue search honors public location visibility. Login session persistence binds the credentials/security version actually checked. Shared streamed-byte enforcement covers legacy JSON/multipart and the existing customer adapter. Supported still images require matching type, bounded dimensions and actual pixel decoding. Success/error responses consistently receive private no-store/nosniff/no-referrer.

Reminder discovery drains past existing notices with accurate creation counts; per-booking lifecycle conflicts no longer stop independent work. Exhausted leases have bounded scoped CAS failure, audit and deduplicated in-app admin alerts. The CLI resolves and confines its database to its own explicit local workspace. Entrance resolves the IC-name field once. The ID checkbox and text now share a usable phone row. No duplicate booking/payment/inventory/admission model was added.

## 4. Authentication and account security

Preserved bcrypt, hashed database sessions, seven-day cookies, active-account and securityVersion checks, revocation and reset architecture. Tests cover invalid/expired/revoked sessions, suspension, role/staff changes, cross-user/admin denial, hostile origin, database rate buckets, reset expiry/reuse and credential replacement between verification and session creation. Both login adapters pass the verified password hash/security version into transactional persistence. Session secrets/passwords/reset tokens are absent from accepted evidence. Production cookie Secure configuration remains; actual hosted TLS/proxy behavior was not accessed or recertified.

## 5. Private event authorization

Identity-bound invitations remain. Valid/wrong/expired/revoked/forwarded cases, unauthorized private access, private files/answers/attendance/profile projections and protected destination links retain regression coverage. New HTTP tests verify hidden entry instructions/coordinates and hidden-venue search negatives. The nine-identity browser matrix respects owner/event authority. Generic organizer-authored descriptions/policies still require appropriate content review; no software test certifies that every future free-text field will be written without private information.

## 6. Payment and refund security

Organizer-direct QR payments remain unchanged: MixerMates holds no funds. Only approved eligible recipient versions serve new bookings; historical recipient/QR snapshots remain immutable. Receipt upload does not confirm funds. Independent finance attestation, correct amount/recipient, separate registration/BYOB gates, rejection/correction and safe duplicate confirmation remain tested. Refund request/review/transfer report/customer acknowledgement remain separate with preserved original records. Acknowledgement is not independent bank settlement verification.

Global transfer reconciliation and suspicious-evidence investigation remain incomplete. The existing upload duplicate screen covers the same customer's latest 100 evidence rows; it is not global fraud detection. No automated bank verification was invented, and no real transfer or financial approval occurred.

## 7. Booking and inventory reliability

Existing serializable transactions, bounded contention retries, event fences and inventory-held CAS remain authoritative. Tests exercise final-seat contention, parallel idempotent reservation, price tampering, expiry versus review, held/confirmed stock, repeated release, payment/issuance/cancellation/refund conflicts and duplicate ticket creation. No negative stock or double release committed in executed checks. Confirmed money remains durable after a failed issuer; ordinary unpaid expiry cannot consume a review-held or funds-confirmed booking.

## 8. Ticket issuance and QR check-in

Existing Phase 5 services/UI are retained. Wrong-event, expired/inactive event, suspended/cancelled/revoked/used ticket, former staff and duplicate QR/manual negatives remain. Concurrent QR/manual admission creates one check-in and one private account/event attendance record. The rendered owner QR was decoded with the existing html5-qrcode library and compared privately in memory. Seven full-screen sizes fit; keyboard focus/Escape and the ID acknowledgement gate pass. Saved test captures clear/mask entry secrets. Online server validation remains mandatory; no offline admission was implemented.

## 9. Upload security

Actual bytes are counted regardless of Content-Length. General/organizer image files retain 4,000,000 bytes; customer evidence retains 10,000,000 bytes. Multipart overhead is separately bounded; legacy JSON is capped at 100,000 bytes. Raster type/MIME, still-image pages and dimensions are checked, then pixels decode before saving original bytes. Maximum raster size is 25 megapixels. SVG/PDF/animated/corrupt inputs fail; purpose/ownership/private download/cache rules remain. Existing 4.5 MB evidence and provider round-trips remain in regression. Paths use random server names, not supplied filenames.

sharp 0.35.5 was already installed through Next and is now explicitly pinned for validation. No package version upgrade occurred. The older PNG/WebP tests used fabricated or damaged samples; genuine samples now exercise their same persistence/authorization assertions. CSV export still escapes formula-leading cells and omits admission credentials.

## 10. Notification and operational jobs

The existing outbox/inbox is reused. Tests cover consent/inactive recipients, essential versus optional delivery, dedupe, bounded retry cycles, concurrent claims, crash/stale/final leases and targeted cleanup. Abandoned final leases now produce the same safe audited failure/alert semantics as ordinary exhaustion. Reminder candidates page past already-notified rows; effects stay capped at 100 newly scheduled reminders per run. A legitimate 409 event change skips its booking; other failures are counted/audited, while revoked admin authority stops the operation. No worker can approve money/registration/refunds.

CLI acceptance ran the new preview with zero failures and rejected a sibling database. Mailbox transport remains mock/local only. Provider idempotency, sender credentials, supervision, retention, general outage detection and real delivery remain unconnected/unverified; LOCAL_OPERATIONS_RUNBOOK.md documents future preparation without activating them.

## 11. Event rescheduling and cancellation

Independent reviewed terms, pending-change freeze, old/new protected customer details, deduplicated notices and historical booking/payment snapshots remain tested. Stale/duplicate/self approvals and cancellation/change/issuance/admission races remain denied or atomically resolved. Cancellation cannot be undone by a late approval. Refund policy software does not establish approved real terms or consumer rights.

## 12. Performance testing and actual measurements

Apple M2 Max, Darwin 27.0.0, Node 22.23.3, Next 16.4.2 development server, isolated SQLite. Fixtures contained 50, 500 and 2,000 fictional attendees. Baseline→final entrance query counts: 63→14, 513→14, 2,021→22. Three-sample service medians in milliseconds: 12.65→6.19, 99.39→29.48, 364.73→116.26. The earlier standalone after run measured 107.38 ms at 2,000; final acceptance also shared CPU with builds.

All 63 measured HTTP requests returned 200; zero failed. At 2,000 attendees median HTTP times were event detail 9.38 ms, ticket selection 10.68, organizer overview 23.47, guest-list transfer 132.78, admin overview 30.90, filtered audit 22.91 and one owner's My Tickets 15.42. Admission service measured 15.01 ms, reservation 8.35 and a 50-notice local batch 191.63. Peak sampled fixture-process RSS was 314.58 MiB. Full data/methodology: PERFORMANCE_TEST_RESULTS.md and raw JSON.

These are sequential local fixtures, not 2,000 simultaneous users or a production SLA. The 2,000-guest response is 459,165 bytes. Full guest-list transfer still scales with event size; very large lists and distributed throughput remain incomplete. Server-only memory, sustained conflict rate, physical connectivity and hosted proxy/CDN behavior were not measured.

## 13. Complete end-to-end testing

Ten main Chrome journeys cover customer/organizer/admin/staff operations, changes, cancellation/refund and worker controls. The customer-to-door core was repeated after final image/mobile changes. A separate real SQLite INSERT-trigger failure after browser funds confirmation left payment confirmed with zero tickets; admin UI recovery and a repeat request yielded exactly one ticket and one funds confirmation. Another browser run made 27 same-origin authorization/cache checks across nine identity/session states. Detailed executed scope and exploratory failures are in END_TO_END_REGRESSION.md; accepted evidence is sanitized.

## 14. Halloween fictional rehearsal

The final separate fictional booking completed identity-bound invitation, required IC-name/age/Instagram, configured RM35, fictional approved QR, private proof, independent funds review, separate registration review, one CHECKED_IN TEST ticket, one check-in and duplicate rejection. A single private Passport record is retained per account/event across repeat rehearsals, rather than duplicated per new booking. Counts/metrics and snapshots are read-only verified in `phase8/halloween-results.json`.

The actual `halloween` event remains **DRAFT / UNCONFIRMED / sales paused**. Its year/time/venue/capacity/recipient/current QR/refund/fee-BYOB terms were not invented or published.

## 15. Browser and mobile testing

Main: 182 surface/theme/width checks. Supplement: 112, including geometry checks for the repaired ID label. Total: **294** across 320/375/390/430/768/1024/1440 and light/dark. The final repeated core adds 112 confirmation measurements, reported separately rather than inflating unique coverage. Seven full-screen QR/focus checks are separate. Accepted runs have zero page errors, broken images or document overflow. Phone and desktop screenshots were visually inspected, including final ID layout; all four required design skills were used. The mechanical detector returned `[]`.

The screenshot review found the checkbox defect despite a passing document-width check; its text width/label height now have direct browser assertions. Coming Soon, logos, typography and the design system remain intact. Design-tool metadata is older than the installed skills; it was left unchanged. Optional `impeccable init`/future landing-page code-first or comp-first preferences can be handled separately. Physical Safari/Android/rear-camera/lighting, screen readers and actual door operations remain unverified.

## 16. SQLite results

Four isolated copies report integrity `ok`, zero foreign-key violations and 13 migrations. A read-only online backup of the populated Phase 7 fictional preview was rehearsed through migration deploy; no pending schema changes were required. All prior rows/columns across 42 tables, including migration history, match fingerprints. No Phase 8 schema migration was introduced. The original canonical database was never migrated or used by the new test client. All 58 preserved root DB/public asset/historical migration hashes match.

## 17. MySQL/MariaDB results

Fresh owned disposable MySQL 8.0.41 and MariaDB 11.8.9 databases applied all eight provider migrations. Each executed **21** actual runtime/concurrency/recovery checks against the final services. They used loopback 13306 sequentially and separate newly initialized data directories. No production restore, Hostinger connection or customer data was used. Both services are stopped after acceptance. Results are separate from the 302-test denominator. Schemas/migration history are unchanged; provider parity was preserved rather than redesigned.

## 18. Automated test totals

Baseline: 272 pass / 0 fail / 0 skip. Final: **302 pass / 0 fail / 0 skipped / 0 cancelled**. The 30 additional counted cases comprise one Phase 8 parent plus 29 subtests. Original test cases were retained; valid image fixtures replaced invalid ones, with their functional assertions preserved. Provider, browser, CLI and load checks are separate totals. Exploratory failures and their corrections are documented in END_TO_END_REGRESSION.md; none is presented as acceptance.

## 19. Build results

`pnpm typecheck`, SQLite `pnpm exec prisma validate`, MySQL-provider validation, and separate `pnpm exec next build --webpack` production-mode SQLite/MySQL-provider builds pass on Node 22.23.3. Builds ran in independent workspaces, never over the running preview. `pnpm audit --json` reports zero advisories. Existing package.json Prisma configuration deprecation remains; no broad dependency upgrade was attempted. Final added local harness/CLI scripts also pass TypeScript.

## 20. Feature checklist totals

309 stable rows: **82 completed and tested; 151 incomplete; 33 blocked; 43 deferred**. Repairs strengthen evidence for existing facets; completion totals were not inflated. `phase8/feature-inventory.json` and feature-summary.json match the master. Counts include overlapping technical/business/human facets and are not a launch percentage.

## 21. Remaining P0 requirements

**79 remain.** Primary-dependency triage: 43 technical facets, 22 owner/human decisions, 10 external/production-operation facets and four physical acceptance facets. Detailed mapping: `phase8/p0-triage.json` and remaining-p0.md. The selected repairs do not claim that all 43 technical facets are now complete. Broader reconciliation, large-list/throughput, monitoring/retention and actual operating acceptance remain explicit.

## 22. Files modified

Fifteen existing application/test/script/dependency files changed and 11 were added; none was removed. Exact source inventory: `phase8/source-changes.json`.

- `app/styles/entrance.css`
- `app/api/[...path]/route.ts`
- `components/entrance.tsx`
- `lib/operational-jobs.ts`
- `lib/entrance.ts`
- `lib/customer-api.ts`
- `lib/auth.ts`
- `lib/registration.ts`
- `scripts/run-operational-jobs.mts`
- `tests/phase4.test.ts`
- `tests/mysql-rehearsal.ts`
- `tests/phase3.test.ts`
- `tests/integration.test.ts`
- `package.json`
- `pnpm-lock.yaml`
- `lib/image-security.ts`
- `lib/request-security.ts`
- `lib/session-security.ts`
- `tests/phase8.test.ts`
- `scripts/phase8-performance.mts`
- `scripts/phase8-recovery-browser.mts`
- `scripts/phase8-browser-fixture.mts`
- `scripts/phase8-mysql.mts`
- `scripts/phase8-browser-supplement.mts`
- `scripts/phase8-browser-security.mts`
- `scripts/phase8-browser.mjs`

Updated required master docs: FEATURE_CHECKLIST, DEVELOPMENT_PROGRESS, TEST_RESULTS, TEST_PLAN, PHASE_PLAN, DECISIONS_REQUIRED and LOCAL_DEVELOPMENT. DEPLOYMENT_POLICY, NOTIFICATION_DELIVERY and HALLOWEEN_END_TO_END_TEST also point to current scope. Created this report, PHASE_8_CHECKLIST, PHASE_8_ISSUE_REGISTER, SECURITY_HARDENING_RESULTS, PERFORMANCE_TEST_RESULTS, END_TO_END_REGRESSION and LOCAL_OPERATIONS_RUNBOOK. Sanitized evidence/screenshots are under docs/phase8. No schema, historical migration, official asset or Coming Soon source was changed.

## 23. Local preview and restart

**http://localhost:3031/organizer/login**; admin `/admin/login`; customer `/my-bookings`. Workspace: `/Users/parsa/.codex/tmp/mixermates-phase8-20261027/preview`. It binds 127.0.0.1, uses its own SQLite audit.db, public Coming Soon and disabled real sales. Private admin credentials remain only in its `.local/admin-access.json`.

Use Node 22.23.3, clear DB_*, load that preview's own .env privately, then `pnpm exec next dev --hostname 127.0.0.1 --port 3031`. Full commands and safe test environments: LOCAL_DEVELOPMENT.md and LOCAL_OPERATIONS_RUNBOOK.md. Do not use canonical dev.db, default 0.0.0.0 scripts, a public tunnel or another preview's absolute DATABASE_URL. Regression 3032 and owned database services are stopped; preview 3031 and prior Phase 6/7 previews remain available.

## 24. Remaining technical/external blockers

Real Halloween terms, fee/BYOB relationship, legitimate organizer/venue/recipient/current QR, approved refund/reschedule rights, reservation/review timing, support and finance/door owners; physical phones/Safari/lighting/network/ID rehearsal; real transactional delivery; supervised workers, alerting, retention and operational backup/restore acceptance; broader exact-transfer/global evidence reconciliation and very large lists/traffic. Account-bound invites do not claim verified email identity. Local mock success does not mean email delivery; customer refund acknowledgement does not prove bank settlement. Real sales/release acceptance needs its own scope and authorization.

## 25. Production safety confirmation

**No production deployment was performed.**

**No production database was modified.**

**The live MixerMates website remains unchanged.**

**Real ticket sales remain disabled.**

This work made no production/Hostinger/domain/database connection or upload, hosting/DNS/environment/CDN/service change, automatic deployment push, public tunnel, real account/transaction, bank operation or real email/SMS/push send. The live site was not accessed to certify current remote state; it was left untouched by this work. The spent Phase 4 approval was not reused. No release/upload package or action was prepared.

## 26. Recommended Phase 9 scope

After a separate owner prompt, prioritize the remaining real-event decisions and named operators, physical secure-local phone/entrance rehearsal, reconciliation/fraud review and measured larger-list/operations acceptance. Prepare providers/supervision/alerts only within an explicitly scoped safe environment. Preserve direct payment, independent review, online admission, privacy and fail-closed sales. No Phase 9 implementation, provider activation, real-sale enablement or deployment is authorized by this report.
