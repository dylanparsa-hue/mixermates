# MixerMates — Phase 4 completion and release report

October 26, 2026 · Asia/Kuala_Lumpur. Final report after the approved integrated Hostinger deployment. Public Coming Soon is live; the customer booking workflow is implemented and locally tested, while real ticket sales remain disabled.

## 1. Overall status

**Phase 4 implementation and the approved guarded Phases 0–4 deployment are complete.** The live domain is https://mixermates.com. The public Coming Soon page uses the official branding; unfinished/customer booking access remains protected and real sales are disabled. This is a guarded release, not certification for operating a real paid event. No Phase 5 work was started.

## 2. Customer access

Dedicated event, owned booking and My bookings routes reuse existing sessions and identity-bound invitations. Login returns to the intended event/booking/history. Fragment invitation secrets are removed from the URL. Private invitations require the named existing account; new adult accounts are allowed only for approved public fictional events in the isolated environment. No customer discovery/admin access was opened. The guarded production candidate refuses the local customer-test adapter even for a valid admin session.

## 3. Checkout

Existing tiers support configured ticket names, quantities, stock and sale windows. The server determines integer-sen prices and entry-option prices, checks event readiness inside the reservation transaction, and deduplicates submissions. A compact event introduction, step navigation, selected total and focused step heading support phone use. No platform custody or gateway was introduced.

## 4. Registration forms

Configured text, textarea, email, telephone, numeric, select, radio, checkbox, file and consent fields validate server-side. Required/optional/conditional fields, choices, age, hidden-field injection and file ownership are covered. IC-name answers drive ticket/check-in holder identity. Evidence-specific conditional fields are fulfilled in the later proof step. Browser rehearsal used IC name, age, Instagram, optional inviter and entry option.

## 5. Approved payment QR

Only an approved active organizer destination can create a paid reservation. The booking retains the recipient version, method, QR and instructions actually presented. Replacement never rewrites historical instructions; disabled versions cannot silently be substituted. Private QR saving and reference copying work locally. Wallet import support and real bank identity are not certified by a fictional QR.

## 6. Private receipts

Genuine PNG/JPG/WebP content, MIME, ownership, purpose, origin, size and rate limits are enforced. Customer evidence allows up to 10,000,000 bytes, independently of the organizer's 4 MB QR limit. Actual 4.5 MB SQLite and MySQL round-trips passed. PDF is explicitly unsupported. Evidence and configured attachments use scoped private endpoints, never public upload paths. Corrections retain history; evidence alone grants neither money confirmation nor admission.

## 7. Payment review

Authorized finance reviewers inspect evidence and independently attest the expected incoming amount in the correct recipient account/version, with notes. A screenshot is insufficient. Wrong amount, recipient, role, missing attestation and repeated/rejected evidence are rejected. Funds confirmation commits before issuance: a forced issuer failure retains confirmed money, records recovery, and permits one retry without repayment. Test confirmations are labeled fictional and claim no real transfer.

## 8. Registration and BYOB approval

Registration approval/rejection remains independent of funds. BYOB has its own evidence decision and never confirms money. The existing shared issuer evaluates all applicable gates. Review notes and prerequisites are explained beside disabled actions. Browser evidence shows confirmed funds with pending registration and zero tickets, followed by separate registration approval and exactly one TEST ticket.

## 9. Digital tickets

Owner-only tickets retain the existing premium white scanning surface and official identity. Private QR/manual credential is exposed only for eligible ticket states; used status is visible and admission is server-authoritative. Authenticated standalone SVG downloads work. Safe SVG previews omit credential, holder, booking reference, exact venue and private-event artwork. The default legacy export remains intact; this phase adds a scoped server export for the customer adapter.

## 10. Check-in regression

Existing QR/manual admission services are reused. SQLite and actual local MySQL contention tests commit one check-in and attendance record. Wrong-event, revoked, cancelled, ended and duplicate attempts fail. Browser staff manual entry with the fictional identity confirmation succeeded once, then displayed “Already checked in. Do not admit again.” Scanner finance/admin access is denied. Physical camera, actual identity documents, Safari, real phones and offline door conditions require separate rehearsal.

## 11. Inventory and expiry

Atomic holds protect finite stock and handle concurrent final-seat reservations. Unpaid abandoned holds release once; late proof fails. On-time proof sets an explicit review hold beyond the original deadline. Confirmed money and review-held stock never silently expire. Rejection/correction keeps review-held inventory until an explicit operator decision/cancellation. A server worker reuses the existing expiry service; no browser timer or hosting cron was activated. Default 60 minutes is a test policy pending owner approval.

## 12. Account and history

Saved booking login, session rotation, owned history, persisted review/audit timeline, private evidence and tickets survive reloads. Unauthorized users cannot read another booking or export. Cancellation reuses existing state/stock/refund-pending rules. No simulated refund is represented as a real refund.

## 13. Organizer management

Booking reviews integrates into the existing studio. Event-scoped answers, evidence, financial/registration/BYOB actions, notes, counts and issuer recovery reuse existing permissions. Owner/admin invitation creation binds a private link to an existing username. Browser rehearsal created and redeemed a second account-bound invitation; no external message was sent. Counts distinguish stock, submitted proof, confirmed organizer funds, ticket issuance and admission. Organizer funds are not platform revenue.

## 14. Administration

The protected admin page integrates the same review surface, with administrator authority and existing audit trail. Ordinary/customer/scanner accounts cannot use it. Optimized production-mode local smoke verified actual MySQL-backed admin login, Secure/HttpOnly/SameSite cookies, authenticated admin API/preview and refusal of production customer test access. The existing administrator was later recovered by the owner: password reset and replacement of the production-blocked demo email were completed through private interactive SSH tools. The existing account ID and role were preserved, old sessions/reset tokens were revoked, and the email correction preserved the password hash. Actual production sign-in and the protected administrator dashboard were then verified. No new administrator account was created. See `phase4/admin-recovery-20261026.json`.

## 15. Notifications

Existing database-backed in-app notifications cover reservation, evidence submission, review/correction, registration and ticket updates. Customer My bookings displays only owned notices. Email/SMS/push delivery and real operational response times remain unverified; no messages were sent externally.

## 16. Halloween

The actual Halloween draft remains unconfirmed and nonbookable. Its year/time/capacity/address/current recipient/QR and fee-or-BYOB relationship were not invented. A distinct visibly fictional rehearsal uses a test overnight date, 40 places, RM35 fee and explicitly configured RM0 BYOB alternative, fake private venue and DO NOT PAY destination. Those inputs are not actual event terms or real banking approval.

## 17. Security

Session/security-version checks, role/object/event scope, private file association, same-origin mutations, bounded bodies, database rate limits, no-store responses, immutable payment snapshots and transaction gates remain server-enforced. Active customer testing is narrowly restricted to explicit isolated local file data or named loopback disposable MySQL schemas. The deployed release pins Coming Soon and disables customer test entry. Source was packaged and built with a host-native Prisma client on Hostinger. Security cases are summarized in `PHASE_4_SECURITY_TESTS.md`.

## 18. Test results

Accepted regression: **200/200**, zero failures, skips or cancellations. The 167 baseline tests were retained; the Phase 4 coverage and MariaDB conflict classification account for the additional 33 counted tests. TypeScript passes. Node **22.23.3** validated, generated clients and built both SQLite and MySQL variants. Separate local MySQL service checks passed **10/10**, and earlier MySQL HTTP checks passed **10/10** across invite_only and approved_events. The matching MariaDB **11.8.9** concurrency rehearsal passed **10/10**. The corrected extracted archive built and passed **25 optimized local production-mode checks**, including authentication against fictional local data. The actual HTTPS domain passed **24 read-only live checks** after deployment. These are separate suites, not a combined regression total.

The production dependency audit reported **zero advisories** at release verification. Security updates include MapLibre 6.4.1 with its official worker, Zod 4.6.6 with record-schema compatibility changes, and scoped Prisma configuration dependency overrides. A bounded retry handles the specific MariaDB 1020 record-conflict error without retrying business failures.

Test setup/fixture issues were resolved without weakening product tests. All test bookings, receipts, payment confirmations and admissions used isolated fictional data. Production migration and live read-only verification ran separately after owner approval and backup/restore checks. Evidence: `phase4/tests.log`, `build-results-current.json`, `mariadb-runtime-results-current.json`, `dependency-audit-current.json`, `release-smoke-current.json` and `production-smoke-20261026.json`.

## 19. Browser results

Completed invited login → ticket/entry selection → private registration → booking → QR/reference save → proof upload → refresh; organizer funds confirmation → separately pending registration → approval → one ticket; customer saved-booking login → private ticket/private and safe SVG downloads; staff manual entry → duplicate rejection; scanner admin denial; owner-created invitation → second customer registration. Admin review rendered separately.

Registration, payment, organizer review, ticket and admin were captured at **320, 375, 390, 430, 768, 1024 and 1440 px**. Light/dark and awaiting/pending/confirmed/used states were reviewed. Final phone/desktop registration and review captures were replaced after finish-review fixes. Some supplementary captures record the earlier local rehearsal, clearly separate from the final scored captures. DOM width checks for ticket and admin are retained; earlier registration/payment measurements were observed but their temporary in-memory list was not retained. Captures remain evidence; no fabricated measurement table is supplied. Cross-owner/private proof/invalid invitation negatives are chiefly HTTP tests, not all manually repeated in the browser. Camera/real-device limitations remain open.

The mechanical detector ran once with no findings. Fresh finish review requested three material fixes; compact task hierarchy/focus, explanatory review requirements and shell heading cleanup were resolved. Final disposition: **ship**, covering those scored fixes. See `phase4/design-review-verdict.md` and `design-system-check.md`. Coming Soon design was not changed. Final live browser checks at 390px and 1440px confirmed loaded official logos and no horizontal overflow; screenshots are under `phase4/screenshots/live-coming-soon-*.png`.

## 20. SQLite

Eleven migrations applied on isolated fresh and populated prior-schema databases. Existing 55 historical rows were preserved across old-column fingerprints; integrity and foreign-key checks pass. Root `prisma/dev.db` remains unchanged. Provider schema/client generation for development is not authorization to migrate that original database.

## 21. MySQL and MariaDB

Local MySQL **8.0.41** fresh/upgrade, transaction, contention, private-evidence, HTTP and recovery rehearsals passed. Historical MySQL TEXT literal defaults were corrected in 21 expressions, with before/after hashes retained and zero logical provider drift recorded.

The actual Hostinger server was verified as **11.8.9-MariaDB-log**. Its two original completed migrations and checksums were compared with the preserved historical source. The initial migration was not rewritten or falsely marked applied. Fresh production SQL was restored to a private disposable database on matching local MariaDB 11.8.9; the four pending migrations applied there and all original columns/rows were preserved.

After approval, the same four migrations applied successfully in production, taking its recorded history from **2 to 6**. A before/after comparison preserved the original data across **33 existing tables**, including the original migration records and checksums. No seed or reset ran. Hostinger’s Prisma CLI could not connect through localhost; IPv4 loopback **127.0.0.1** was verified and saved, with bounded engine worker settings. The active generated client subsequently connected successfully. Existing counts remained 10 users, 7 events, 0 bookings, 0 payments, 0 tickets and 4 uploads.

## 22. Integration through Phase 4

Existing branding, protected Coming Soon, admin/organizer preview, event configuration, destinations/verification, sessions, invitations, booking/payment/ticket/attendance services and prior tests remain. Forty models remain; Phase 4 adds Booking.reviewHold and PaymentReview.receivedAmount/recipientVersionId rather than a second payment system. Customer routes are a scoped adapter. The candidate includes all application work through Phase 4 while its public/sales gates stay closed. The frozen Phase 1 archive is preserved.

## 23. Feature counts

The last full master-inventory audit records **309 requirements: 67 completed and tested; 166 incomplete** (122 in progress, 30 not started, 14 needing verification); **33 blocked; 43 deferred**. Of 135 P0 requirements, 42 were completed and **93 remained** at that inventory snapshot. Ten bounded local facets were newly completed in Phase 4.

These conservative inventory counts were not rescored simply because deployment succeeded. They are not a launch percentage. Deployment-specific safety checks are now completed as documented in this report; broad real-event, payment and operating requirements remain open. Source: `phase4/feature-inventory.json` and `phase4/feature-summary.json`.

## 24. Remaining P0 and sales-activation gates

The guarded deployment safety gates—host/version/history comparison, current private backups, matching-engine restore/upgrade, native build, database connection and live access checks—are complete. The following remain before actual event operations:

- Verify the owner’s production administrator sign-in and provision/review organizer and staff permissions. The owner subsequently recovered the existing administrator and production sign-in/dashboard access was verified on October 26. Organizer and staff provisioning still require their own review.
- Verify the real organizer, payment recipient account and current payment QR.
- Confirm actual event date/time, capacity, venue disclosure, prices and fee/BYOB policy.
- Approve reservation/review timing, corrections, cancellations, refunds and support ownership.
- Verify operational notifications/delivery and configure the expiry worker/monitoring when approved.
- Rehearse physical-device camera scanning, identity checks, duplicate admission, Safari and door connectivity.
- Obtain separate owner approval before real sales or additional deployments.

The host’s maximum application upload/proxy behavior for real receipt traffic is not certified by read-only Coming Soon checks.

## 25. Changed files

Primary changes: customer-policy, customer-api, registration and ticket-export modules; extensions to booking-domain/payment-foundation/domain-core/services; customer-booking and booking-reviews components; existing organizer/admin/digital-ticket integrations; scoped customer CSS and routes; proxy body bound; both provider schemas/migrations; expiry/fixture/release scripts; Phase 4 tests and documentation. Exact code inventory/hash is `phase4/release-audit.json`; source-before schemas and migration default changes are retained. No credentials, DBs, private uploads or fixture accounts belong in the candidate.

## 26. Local preview and cleanup

The release is publicly available at https://mixermates.com. Temporary isolated application servers on ports **3001, 3002 and 3003**, the disposable local MariaDB server and the temporary SSH control connection were stopped after verification. The previous localhost preview is therefore not currently running.

Private fictional fixtures and restoration workspaces remain outside the repository under the isolated Phase 4 temporary directory. Original `prisma/dev.db`, official assets and the frozen Phase 1 archive remain unchanged; all **19 preservation checks** passed.

## 27. Deployed archive and checksum

Archive: `/Users/parsa/Desktop/MixerMates-Phase4-Integrated-Release.zip`.

SHA-256: `c402387bab0102101587b4453e4f61494154555a73f765cce0e9eb3ed29280c2`.

Source root `MixerMates-website`; Next.js; Node22.x; pnpm; build `pnpm run build`; output `.next`. Hostinger rebuilt the source for Linux. The archive contains the application through Phase 4, MySQL schema/migrations and official assets; it excludes credentials, databases, private evidence and fixture accounts. Coming Soon is pinned; startup bootstrap, demo mode and seeding are disabled. The frozen Phase 1 ZIP was preserved. Inventory and deployed archive metadata: `phase4/release-audit.json`.

## 28. Production backup, recovery and migrations

Hostinger confirmed a fresh managed files/database backup at **17:36 panel time on October 26**. A separate current consistent SQL dump, prior application runtime and environment backup were downloaded to private storage outside the source tree. Sizes and SHA-256 hashes were verified. AES-256-GCM encrypted copies were created, with keys stored separately and decryption hashes verified; private working copies remain for recovery.

The fresh SQL restored successfully on matching local MariaDB 11.8.9, and the reviewed upgrade preserved original data. The prior runtime archive was readable and contained its server/package files. Production then received only the four reviewed pending migrations, with no reset or seed. Original table data and prior migration records were verified afterward.

Rollback materials and retained Hostinger deployment versions remain available privately. No production rollback was performed or rehearsed by restoring over the live database; actual recovery would require controlled maintenance and reconciliation of any later writes. Evidence: `phase4/host-backup-current-20261026.json`, `backup-encryption-current.json`, `current-host-upgrade.log` and `production-migration-result.json`.

## 29. Deployment status and resolved incidents

**The approved integrated Phases 0–4 release is deployed and verified.** Active Hostinger deployment: `01a177b4-35a0-7375-829d-76f141d3ba34`, completed **October 26, 2026 at 18:16 panel time**. Public URL: https://mixermates.com. No DNS change was made.

Applying the approved environment settings first triggered a Hostinger rebuild of the previous source. The new integrated source then built successfully, but live checks exposed an uninitialized top-level Prisma client in the standalone runtime. The valid generated native client was copied into that resolution path and the existing managed restart marker updated to restore service. The build helper was then fixed, a disposable placeholder regression passed, the corrected archive was rebuilt and passed 25 optimized local checks, and a second managed deployment installed the durable fix. The active version was checked for the initialized client and expected dependency versions. Initial route errors were resolved; 24 final live HTTPS checks passed.

A CDN file-hash mismatch was traced to PNG re-encoding: decoded dimensions and RGBA pixels match the original logos exactly. Hostinger also confirmed cache refresh. No production test accounts, bookings, payment confirmations or tickets were created. Current evidence: `phase4/final-verification-current.json`, `production-runtime-final.json` and `production-smoke-20261026.json`.

## 30. Real-sales status

**Disabled.** Production customer test routes intentionally remain unavailable. Requested invite_only and approved_events behavior was tested on disposable local MySQL, not enabled on the domain. Fictional destination approvals, receipt reviews and tickets do not authorize money collection or actual admission. Sales activation needs a separate approved readiness step after genuine identities, event terms and operating controls are established.

## 31. Owner decisions and operations still required

The owner must confirm actual event facts and fee/BYOB terms; verify organizer/payment-recipient identity and QR; name finance, registration, door and support operators; approve hold/review/refund/cancellation timing; and arrange communication and physical-device rehearsal. Access to the retained production administrator account was recovered and verified on October 26. The owner entered and submitted the new password and real login email directly; no new administrator account was created.

The October 26 deployment approval has been used for this guarded release. It does not authorize opening sales, future deployments or Phase 5 automatically. Keep database passwords and recovery keys out of reports, source archives and chat.

## 32. Recommended next work

Production administrator access is now verified. Continue with a separately scoped real-event readiness checklist covering event facts, the recipient/QR, operator permissions, communications, expiry scheduling and physical door rehearsal. Resolve those gates before proposing real-sales activation. Phase 5 has not been started automatically.

Phase 4’s customer booking/review/ticket implementation and the owner-approved guarded deployment are complete. Actual money collection and admission remain disabled pending real-world acceptance and separate authorization.
