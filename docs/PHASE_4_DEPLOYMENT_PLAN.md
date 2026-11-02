> Current release — October 26, 2026: The owner-approved integrated Phases 0–4 release is deployed at https://mixermates.com. Public Coming Soon is active; real ticket sales, demo mode, startup bootstrap and seeding are disabled. Corrected source SHA-256: `c402387bab0102101587b4453e4f61494154555a73f765cce0e9eb3ed29280c2`. Active Hostinger deployment: `01a177b4-35a0-7375-829d-76f141d3ba34`, completed 18:16 panel time. Acceptance: 200 local tests, typecheck, Node 22 builds, matching MariaDB concurrency/recovery checks, 25 optimized local checks after the runtime packaging repair, and 24 live HTTPS checks. The four reviewed production migrations completed; all original columns/rows across the 33 prior tables and historical migration checksums were preserved. Fresh SQL/application/environment backups were downloaded privately, encrypted with verified decryption hashes, and the SQL restore/upgrade was rehearsed on local MariaDB 11.8.9. Mobile 390px and desktop 1440px live layouts/logo loading were verified. No fictional accounts, bookings, payments, seed or reset were created in production. Production admin sign-in and real-sales operations remain unverified and require their own appropriate setup/acceptance. This approval covers this guarded release only; future deployments and sales activation still require owner authorization. See `phase4/final-verification-current.json` and `phase4/production-smoke-20261026.json`. Earlier dated entries below are historical.

> October 26, 2026 update: The owner explicitly approved the guarded integrated Hostinger deployment ("its approved"). Current code passes 200 regression tests, TypeScript, both Node 22 provider builds and 10 matching MariaDB 11.8.9 concurrency checks. Production dependency audit reports zero advisories after the validation-library update. Hostinger confirmed a fresh files/database backup at 17:36 panel time. Production release has not yet occurred; SSH migration access and refreshed database/rollback verification remain pending. Public Coming Soon and disabled real sales are mandatory. See `phase4/release-progress-20261026.json`; older dated results below are historical.

# Phase 4 — one integrated Hostinger release

Preparation only. **No production deployment was performed.** The Phase 4 owner brief supersedes the old phase allocation: prepare one integrated Phase 0–4 release, then obtain final approval after the gates pass. The old Phase 1 ZIP remains frozen. No feature-by-feature upload or automatic Git deployment is authorized.

## Candidate and managed build

Candidate: `/Users/parsa/Desktop/MixerMates-Phase4-Integrated-Release.zip`, with adjacent `.zip.sha256`; exact inventory/hash in project `docs/phase4/release-audit.json`. Build and inspect the extracted candidate before proposing upload. Source root: `MixerMates-website`; Next.js; Node **22.x**; pnpm; `pnpm run build`; output `.next`. A standalone start may use `.next/standalone/server.js` only after confirming hPanel's existing convention. The build copies static/public assets, runtime dependencies and the expiry worker's source/runtime; it does not connect to a database or migrate/seed.

Hostinger documents ZIP import, managed Next.js builds and Node 22 support in its [official Node.js guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/). This verifies product support, not this account's plan/configuration or installed database version. No hosting settings have been invented or changed. A source ZIP is rebuilt on the host so its Prisma engine matches Linux/OpenSSL; the local macOS build is not a host binary certification.

## Non-negotiable preflight

1. Read the current hPanel deployment and record domain, root/build/start/output, Node version, environment-key names and current release reference without copying secrets into reports. Confirm managed Node plan, real MySQL/MariaDB version, TLS, native Prisma support, filesystem persistence and incoming multipart limit ≥10,100,000 bytes (12 MB recommended). The app's proxy buffers up to 12 MB, while the handler enforces ≤10,000,000 evidence bytes; organizer QR remains 4 MB. Host proxy/DB packet limits still require actual hosted verification before real sales.
2. Record production schema and `_prisma_migrations` names/checksums. Local MySQL 8.0.41 passed fresh migration, representative prior-schema upgrade, transactions/contention, multi-process rate limiting, backup and restore. **Historical MySQL TEXT defaults were corrected to parenthesized expressions**, with before/after hashes in `phase4/mysql-default-compatibility.json`; provider schema uses introspected expressions and reports zero drift. Review current host migration history against both hashes. Never blindly rewrite `_prisma_migrations`, mark unknown migrations applied, reset a database or use production to discover DDL compatibility.
3. Take a consistent production SQL backup and current application/environment/upload backup through authorized hosting tools. Keep it encrypted/private with timestamp, version, checksum, size and named operator. Verify it is nonempty/readable and restore a sanitized copy into a disposable matching-version database. The local fictional backup/restore passes but is **not** a production backup. No production customer backup was accessed or certified here.
4. Establish maintenance/traffic control if DDL or package build requires it. Record current app restoration procedure and actual host backup restoration availability. Agree downtime/support owner. Do not claim transactional rollback for MySQL DDL.
5. Verify real admin provisioning/session configuration without demo accounts. No demo seed is included. Public sales remain disabled, Coming Soon pinned. Existing production payment/identity policies are not certified by fictional fixtures.

If any migration/backup safety gate is unknown, deployment remains blocked. Do not substitute a successful build for these checks.

## Reviewable production changes after explicit approval

One source upload/build for integrated Phases 0–4; reviewed additive MySQL migrations only; explicit private environment validation; app restart using the recorded managed framework entry; smoke tests. No DNS change is planned. No destructive reset, test-data import, fictional QR/receipt upload, seed, automatic payouts or sales activation. The deployment may temporarily interrupt requests during build/restart; actual downtime depends on the existing Hostinger setup and is not measured locally.

Use `PHASE_4_ENVIRONMENT.example` as a proposal. Replace placeholders privately. DB_* values override DATABASE_URL through the existing resolver; preserve exactly one correct group. NODE_ENV production makes cookies Secure/HttpOnly/SameSite=Lax. APP_ORIGIN must be the actual HTTPS domain. Keep all demo/isolation/bootstrap/seed flags false, SITE_MODE coming_soon and TICKET_SALES_MODE disabled. The candidate is pinned and customer test routes refuse production even if test flags are accidentally supplied. Admin and owned organizer preview remain protected by sessions and object permissions. Do not turn on AUTH_TRUST_PROXY before verifying forwarded-header stripping.

## Single coordinated procedure

After preflight and fresh owner approval:

1. Confirm current backup/rollback materials and planned maintenance window.
2. Upload the verified **new integrated** ZIP in the existing Hostinger Node.js application's redeployment flow. Choose the new source file, not “use previous files” or the frozen Phase 1 ZIP. Confirm root/build settings above; do not assume a file-manager copy alone starts a Next.js server.
3. Install frozen dependencies/build through hPanel. Apply private environment proposal only as approved; never import the local `.env` or copied SQLite.
4. At the authorized migration step run `pnpm exec prisma migrate deploy --schema prisma/mysql/schema.prisma` against the verified production connection, using the exact reviewed migration history. Startup bootstrap remains false. If DDL fails, stop and follow the reviewed recovery plan; do not retry exploratory SQL or reset data.
5. Start/restart through the recorded managed Node entry. Confirm healthy logs and connection before returning traffic.
6. Verify the actual HTTPS domain: official Coming Soon/logo, no private/discovery/admin/test content; ordinary/private-link denial; admin login/preview; organizer owned dashboard/QR settings; secure session cookies; no test/debug endpoints enabled; migration versions and historical record counts preserved. Customer booking routes should remain closed in this guarded candidate. Do not enable sales as a smoke test.
7. Record actual deployment ID/time/operator/checksum, schema version, smoke results and any incidents. Only then report a completed deployment.

## Rollback / recovery

Keep the prior application package and its compatible schema backup private. If app smoke fails before new writes, restore the prior recorded release/environment through hPanel. If schema changes or new writes make that binary incompatible, use the verified database backup/restore procedure during maintenance; reconcile any post-backup changes rather than silently discarding customers. DDL recovery is a controlled restore/reconciliation task, not an automatic down migration. Verify restored counts, financial records, recipient versions, ticket-token hashes and admission history before reopening. Actual host restoration must be rehearsed/confirmed by the release operator; it is not yet certified.

## Reservation expiration on Hostinger

The existing domain service is invoked by `node --import tsx scripts/expire-reservations.mjs` (or `pnpm reservations:expire`) from the deployed source root. Configure a five-minute server-side cron using the host's actual Node 22 path and working directory; do not invent either path. For a standalone-only checkout, the build includes scripts/lib/MySQL runtime files. Host scheduling availability and execution logs must be verified. No browser tab is required.

Before enabling the job, set EXPIRY_WORKER_ENABLED=true and an explicitly provisioned active administrator EXPIRY_ACTOR_ID; keep the approved HTTPS origin and private MySQL settings. The worker processes ≤200 due unpaid REAL, non-test holds per run, with transaction-safe exactly-once release. Submitted proof/reviewHold and confirmed payments are excluded; those require a human decision/cancellation. Failed permissions leave stock held and produce a nonzero status for monitoring. Review-held stock has no automatic short-timeout release; operator must review or cancel/refund, including at event closure. The default 60-minute pre-proof hold is a **local test policy** until the owner approves real review/support timing. Do not activate cron or real sales from this document alone.

## Final approval boundary

Present the readiness report, actual test results, real-sales status, MySQL/host preflight, outstanding risks, exact production changes, backup/rollback, archive/hash and operational impact. Only once deployment safety is established ask:

> Phase 4 is complete and the integrated MixerMates release is ready. Do you approve deploying Phases 0–4 together to your Hostinger domain?

If host/schema/backup safety remains unresolved, report the blocker and request the missing specific information instead of claiming readiness. Real-sales activation requires its own later checks/approval even after a guarded deployment. Do not start Phase 5 automatically.
