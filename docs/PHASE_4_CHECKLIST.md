> Current release — October 26, 2026: The owner-approved integrated Phases 0–4 release is deployed at https://mixermates.com. Public Coming Soon is active; real ticket sales, demo mode, startup bootstrap and seeding are disabled. Corrected source SHA-256: `c402387bab0102101587b4453e4f61494154555a73f765cce0e9eb3ed29280c2`. Active Hostinger deployment: `01a177b4-35a0-7375-829d-76f141d3ba34`, completed 18:16 panel time. Acceptance: 200 local tests, typecheck, Node 22 builds, matching MariaDB concurrency/recovery checks, 25 optimized local checks after the runtime packaging repair, and 24 live HTTPS checks. The four reviewed production migrations completed; all original columns/rows across the 33 prior tables and historical migration checksums were preserved. Fresh SQL/application/environment backups were downloaded privately, encrypted with verified decryption hashes, and the SQL restore/upgrade was rehearsed on local MariaDB 11.8.9. Mobile 390px and desktop 1440px live layouts/logo loading were verified. No fictional accounts, bookings, payments, seed or reset were created in production. Production admin sign-in and real-sales operations remain unverified and require their own appropriate setup/acceptance. This approval covers this guarded release only; future deployments and sales activation still require owner authorization. See `phase4/final-verification-current.json` and `phase4/production-smoke-20261026.json`. Earlier dated entries below are historical.

# Phase 4 acceptance checklist

October 20, 2026. Scope: local fictional acceptance and a guarded integrated source candidate. **No production deployment was performed.** This checklist does not certify real banking, the actual Halloween event or physical entry hardware.

| Area | Result | Evidence / limit |
| --- | --- | --- |
| Preserve Phases 0–3, original database, Coming Soon and official logo | PASS locally | `phase4/preserved-before.json`; final preservation check. Existing domain services retained. |
| Scoped customer entry and account-bound invitations | PASS locally | Phase 4 tests; browser invited login and scoped return. No discovery access. |
| Ticket types, quantity, exact server price, stock and idempotency | PASS locally | Existing tier model; concurrent last-seat checks on SQLite and MySQL. |
| Dynamic registration and age / private file validation | PASS locally | All supported field types tested; browser IC name, age, Instagram, optional inviter and entry selection. |
| Approved organizer-direct QR and immutable booking recipient | PASS locally | No platform custody; replacement cannot rewrite booked instructions. |
| Private proof upload and correction history | PASS locally | PNG/JPG/WebP, genuine content, ownership and 10 MB bound; 4.5 MB SQLite/MySQL round-trips. PDF unsupported with explicit error. |
| Separate funds, registration and BYOB decisions | PASS locally | Browser confirms money while registration remains pending and zero tickets; independent later approval issues one. |
| Funds confirmation durable if ticket issuance fails | PASS locally | Forced issuer failure preserves confirmed funds; retry issues once without repayment. |
| Existing ticket issuer and admission controls | PASS locally | QR/manual contention, event/owner/status checks; browser manual entry succeeds once and rejects duplicate. |
| Customer history, private ticket and safe download | PASS locally | Persisted booking, in-app notices, private SVG download and sanitized share SVG; holder uses registration IC name. |
| Organizer and admin review surfaces | PASS locally | Role-scoped records, answers, private evidence, notes, amount, independent checkbox and invitation creation. |
| Expiry and submitted-proof hold | PASS locally | Exactly-once stock release for abandoned unpaid holds; review-held/confirmed stock excluded. Server worker prepared, cron not enabled. |
| Actual Halloween protection | PASS locally | Unconfirmed draft remains nonbookable; separate clearly fictional rehearsal only. |
| Regression and security tests | PASS | 199 / 199; 167 baseline retained; typecheck. See `phase4/tests.log`. |
| Node 22 builds | PASS locally | SQLite and MySQL validation, client generation and optimized builds; `phase4/build-results.json`. |
| SQLite migration / legacy preservation | PASS | 11 migrations; populated upgrade, integrity and foreign keys. `phase4/migration-verification.json`. |
| MySQL runtime / recovery | PASS on local 8.0.41 | Six migrations, ten service/concurrency checks, ten HTTP checks across invite_only / approved_events; populated upgrade and backup restore. Host version not certified. |
| Responsive rendered review | Captured | 320/375/390/430/768/1024/1440 registration, payment, organizer, ticket and admin. Light/dark and pending/confirmed/used states. See visual review verdict. |
| Real phone, Safari, camera QR, actual ID and offline door | NOT VERIFIED | Browser manual path is not physical hardware certification. |
| Integrated sanitized Phase 0–4 candidate | Prepared for local archive validation | `phase4/release-audit.json`; release remains pinned Coming Soon, sales disabled. |
| Actual Hostinger version/schema/checksum/backup and rollback | BLOCKED | Requires account-specific read-only preflight and a verified private backup; local fictional dump is not a production backup. |
| Upload, migration, restart and actual-domain smoke | NOT PERFORMED | Final owner approval is required after the safety gates are met. |
| Real sales activation | BLOCKED | Actual recipient identity, event facts, review/refund/support policies and operational checks remain unapproved. |

Read `PHASE_4_REPORT.md`, `PHASE_4_DEPLOYMENT_PLAN.md` and `CUSTOMER_BOOKING_AND_PAYMENT.md` together. Earlier phase reports are historical evidence, not overwritten acceptance for this phase. Master product rows remain incomplete where their broader real-world acceptance is unmet.
