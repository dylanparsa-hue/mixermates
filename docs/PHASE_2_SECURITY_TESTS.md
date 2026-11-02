# Phase 2 security and transaction evidence

October 20, 2026. Accepted local suite: **140 tests, 140 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo**. Node's count includes parent test cases. Existing 116 cases remain; the new Phase 2 group adds 24 (23 subtests plus its parent). Blocked external verification is listed separately rather than added to executed test totals.

| Area | Executed evidence |
| --- | --- |
| Authentication | Normalized login/registration; impossible date and UTF-8/bcrypt limits; strict no-role registration; generic wrong/unknown admin login; inactive account denial; hashed session lookup; expiry/logout; active security-version revocation after role/capability changes |
| Recovery | Same known/unknown HTTP message; private local mailbox; hash-only DB token; 15-minute bound; expiry/replay denial; password hash comparison and all-session revocation; mailbox file mode 0600 |
| Shared rate limits | Concurrent 7 requests with limit 3 produce exactly 3 successes; a new Prisma client sees count 3; subsequent call denied; HTTP auth account/IP throttling still passes |
| Invitations | Unauthorized issuer/customer/anonymous denied; hash-only secret; exact account/event binding; forwarded/unknown/wrong-event/expired/revoked denial; parallel repeat consumes one use/grant; revocation preserves reservation; no grant-only address release |
| Permissions | Cross-organizer ownership; staff assignment scope; scanner finance/location denial; immediate staff revocation; multiple capabilities without replacing base role; object-level API denial; no scanner receipt access |
| Capacity | Last seat has one winner; event and tier counters both 1; duplicate booking key creates one hold; different customer with same key rejected; repeated concurrent cancel/expiry releases once and never below zero |
| Approvals | Conflicting approve/reject produces one decision/audit and matching ticket state; no customer self approval; unpaid/receipt-only/registration-only paid booking cannot issue; foreign/oversize receipts and mismatched evidence rejected |
| Payment | Independent authorized fundsVerified and exact amount required; one issuance audit/notice/ticket despite repeated issuance; matching retry only; pending QR replacement preserves active version; later approved version preserves historical booking snapshot |
| AUD-01 | Valid ticket → admin suspension → QR and manual denial; zero attendance/check-in writes; issuance denied; organizer cannot restore; authorized admin restoration works |
| Invalid entry | Revoked, cancelled, completed, ended, wrong-event, invalid/replayed and already checked-in tokens denied; parallel QR/manual claim has one winner; original check-in history preserved |
| Privacy | Existing discovery/social tests; private attendance excluded despite public social flags; pending location denied; confirmed eligible location allowed; private media denied; narrow staff projection; receipt scope; Coming Soon API/RSC/no-store protections |
| Refund/BYOB | Confirmed direct-payment cancellation records REFUND_PENDING with zero simulated refund; BYOB approval is separate and never confirms payment; test-origin records denied outside isolated environment |
| Atomicity | Deliberate FK failure rolls back inventory, audit and notice transaction; sensitive successful transitions persist audits and deduped in-app notices |

## Accepted execution

Run from the isolated regression workspace, not the original source database. Explicitly load its guarded `.env` and set TEST_BASE_URL=http://localhost:3002, ACCESS_TEST_BASE_URL=http://localhost:3001, ACCESS_TEST_DATABASE_URL to the separate preview SQLite and ACCESS_ADMIN_CREDENTIAL_FILE to its private local file. Then run `pnpm test` and `pnpm typecheck`. Private credential contents/mailbox files must never be printed or copied into reports.

Both Next development servers bind loopback. Port 3001 uses coming_soon, DEMO_MODE=false and sales disabled. Port 3002 uses full_platform plus every explicit local demo flag and a separate fictional database. Original root port 3000 is not a test target. The port-3002 server is stopped after verification.

Baseline adaptation: the private demo booking fixtures now create/redeem stored account-bound invitations rather than bypassing the new requirement; the dedicated admin-login test sends only email/password from the private fixture file (its `localOnly` metadata is not login input). The untrusted-client invitation test was renamed to reflect implemented server grants. No tests were deleted and no financial assertion was weakened.

Earlier failures are recorded in working logs: server bound 0.0.0.0 failed the intentional loopback demo-origin guard (fixed by binding localhost); the strict login parser rejected fixture-only localOnly metadata; a negative test expected 409 where the safe invalid-ticket response is 400; fixture cleanup omitted generated user badges. Accepted reruns include all fixes. No backend bypass was added to make tests pass.

## Blocked or not certified

**Blocked validation areas (2):** (1) actual MySQL migration/runtime integration and restore rehearsal; (2) MySQL concurrency/multi-process shared throttling. There is no local MySQL service/container runtime. Schema/client/build checks do not substitute for these tests. These are outside the 140 executed Node tests, not hidden skipped cases.

Production recovery mail delivery (AUD-06), actual bank/funds verification, real HTTPS/CDN/Secure-cookie operation, physical scanner/camera/offline handling, load/security operations, and optional stale Playwright spec (AUD-05) remain unverified/not run as applicable. No production mail or payments were attempted. No tamper-proof audit claim, penetration-test certification or legal compliance assertion is made.
