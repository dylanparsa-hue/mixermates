# Current Phase 11 isolated preview — October 27, 2026

Canonical `/Users/parsa/Desktop/EVENT FINDER`; preview **http://localhost:3061/organizer/login**, admin `/admin/login`, customer `/my-bookings`; workspace `/Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview`. Original DB is never used. Coming Soon/disabled sales, false demo/bootstrap/seed and explicit fictional customer adapter remain. Credentials stay only in `.local/admin-access.json`.

After checking3061 is free, restart from preview:

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview
python3 ../run.py preview pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3061
```

The private runner pins Node22.23.3/pnpm, clears all DB_*/inherited DB settings and loads only this copy's `.env`, verifies contained audit.db and false startup bootstrap/seed. Never run default0.0.0.0 scripts, a tunnel, production helpers or the current client against canonical `prisma/dev.db`.

Final353-test regression is sibling `regression` on3063 (stopped). Start it with `python3 ../run.py regression pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3063`, then in a second terminal `python3 ../run.py regression pnpm test`. ACCESS_* intentionally targets the fictional3061 preview. Current browser command from preview: `E2E_BASE_URL=http://localhost:3061 python3 ../run.py preview pnpm test:e2e`. It requires owned Phase11 marker/contained DB/disabled sales/matching origin and a prestarted server; canonical defaults are refused. No automated credential-bearing traces/screenshots.

Fresh348 baseline ran byte-identical in the newly created Phase10-namespaced child `mixermates-phase10-20261027/phase11-baseline` on3062 only to honor the original test path guards; no old accepted workspace was reused/reset. It is stopped. New SQL daemon data directories also use unique Phase11 names under the Phase10 parent solely for the unchanged SQL-socket safety assertion. Final runner/logs stay in Phase11 scratch; SQL daemons are stopped.

Sibling `build` and `mysql-workspace` have separate generated clients; never change a running SQLite client's provider. Optimized builds were local `next build --webpack`, not public/upload packages. No schema changes;14 SQLite/nine MySQL migrations. Recovery/worker guards now explicitly accept owned Phase11 paths while still refusing canonical/siblings/DB_* overrides. Restore never overwrites a file. Detailed startup/fixtures/testing/security/remaining work: [FINAL_DEVELOPMENT_HANDOFF.md](FINAL_DEVELOPMENT_HANDOFF.md); operations/retention/provider requirements: [OPERATIONS_HANDOVER.md](OPERATIONS_HANDOVER.md). Earlier environment instructions below are historical.

# Current Phase 10 isolated preview — October 27, 2026

Canonical: `/Users/parsa/Desktop/EVENT FINDER`. Preview: **http://localhost:3051/organizer/login** (admin `/admin/login`, customer `/my-bookings`), workspace `/Users/parsa/.codex/tmp/mixermates-phase10-20261027/preview`. It retains public Coming Soon, disabled real sales, false demo/bootstrap/seed flags and explicit fictional customer adapter. Private admin credentials remain only in `.local/admin-access.json`. No root dev.db use/migration.

Safe restart after checking3051 is free:

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase10-20261027/preview
python3 ../run.py preview pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3051
```

The retained local runner loads only this copy's `.env`, clears every DB_* override, pins its contained audit.db and keeps both HOSTINGER flags false. Node22.23.3 path is set privately by the runner. It does not seed/migrate/deploy. Webpack dev is the accepted preview restart mode; the earlier Turbopack cache was preserved outside the workspace after a local rebuild loop.

Final348 tests ran in sibling `acceptance` on3056, independent of the deliberately large `regression` load fixture on3052. Both are stopped after verification. To repeat acceptance, start3056 from that copy with `python3 ../run.py acceptance pnpm exec next dev --hostname 127.0.0.1 --port 3056`, then in another terminal run `python3 ../run.py acceptance pnpm test`. ACCESS_* targets intentionally name3051 and its private credentials/database; no production URL. Do not point the suite at the canonical DB or run it on the load fixture and expect its bounded worker backlog assumptions.

From the preview, current guarded browser suite:

```sh
E2E_BASE_URL=http://localhost:3051 python3 ../run.py preview pnpm test:e2e
```

The config requires the exact owned marker/contained DB, disabled sales and matching loopback APP_ORIGIN, and never starts a server itself. Canonical defaults intentionally fail. Automatic authenticated traces/screenshots are off; source-driven Phase10 journey harnesses mask private QR/code evidence. Do not reset accepted fixtures to replay creation; fresh workspaces or the current idempotent acceptance tests retain prior history.


Current incident/recovery procedures: DISASTER_RECOVERY_RUNBOOK.md. Local worker: after loading this copy's environment, use LOCAL_OPERATIONS_ACTOR_ID=phase1_preview_admin with scripts/run-operational-jobs.mts. Never substitute a production DB/provider.

# Current Phase 9 local operations

Use the new fictional preview at http://localhost:3041/organizer/login in `/Users/parsa/.codex/tmp/mixermates-phase9-20261027/preview`. Use Node22.23.3, clear DB_*, privately source its own .env, then `pnpm exec next dev --hostname 127.0.0.1 --port 3041`. Public Coming Soon and disabled real sales remain. Use only private local administrator credentials. Worker command: `LOCAL_OPERATIONS_ACTOR_ID=phase1_preview_admin pnpm exec tsx scripts/run-operational-jobs.mts` after loading that environment; its path guards now include Phase9 and still reject sibling DBs.

Booking reviews has named disclosures for reconciliation and all-registration tools, plus private per-booking risk/history. Duplicate signals require investigation; independently checked incoming funds and separate approval remain mandatory. The financial summary separates gross organizer-received records, current claims, outstanding active bookings, refunds and private payment concerns. Recheck after changes; streaming exports are not a frozen accounting snapshot. No real transfer or email is performed.

Detailed current acceptance: PHASE_9_REPORT.md, PAYMENT_RISK_REVIEW.md, PAYMENT_RECONCILIATION.md, EVENT_READINESS_REVIEW.md and PHYSICAL_SCANNER_TEST_PLAN.md. Regression3042 and all owned disposable SQL services are stopped after acceptance. Preview3041 stays available. Earlier Phase8 procedure below is historical and its ports/paths are not the current default.

# Phase 8 local operations runbook

Use only the existing fictional Phase8 preview. Public access remains Coming Soon; real sales are disabled. Do not use the canonical original database, Hostinger, production credentials, a restored customer database or a public tunnel.

## Open and restart

Preview: http://localhost:3031/organizer/login. Admin: /admin/login. Customer history: /my-bookings (requires an existing fictional booking context). Private admin credentials are in the preview’s `.local/admin-access.json`; open privately, never paste into reports.

Check port3031 before restarting; preserve any existing server. From a terminal:

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase8-20261027/preview
export PATH="/Users/parsa/.codex/tmp/mixermates-phase1-20261019/node22/node-v22.23.3-darwin-arm64/bin:$PATH"
unset DB_PASSWORD DB_NAME DB_USER DB_HOST DB_PORT
set -a
source .env
set +a
pnpm exec next dev --hostname 127.0.0.1 --port 3031
```

Its `.env` must keep its own file:audit.db, APP_ORIGIN=http://localhost:3031, SITE_MODE=coming_soon, TICKET_SALES_MODE=disabled, DEMO_MODE=false, ISOLATED_TEST_DATA=true, LOCAL_CUSTOMER_TEST_ENABLED=true, LOCAL_DEMO_BOOKING_ENABLED=false and both HOSTINGER flags false. These are fictional local flags, not release configuration. Do not run the default dev/start scripts that bind0.0.0.0. Do not migrate/seed/reset the original `EVENT FINDER/prisma/dev.db`.

## Monitor and run jobs

1. Sign into Admin → Operations. Inspect delivery failures, unreleased expired holds, old reviews and issuance recovery.
2. Run **Run local operational jobs**. Review the returned counts and failure activity. Each run handles at most100 expiry candidates,100 newly scheduled reminders and50 normal notification claims, plus a separately bounded final-lease cleanup. Reminder discovery walks100-row pages past already-notified bookings; it does not truncate the queue after the first100.
3. A409 reminder eligibility race skips that booking and continues. Other reminder failures count and record REMINDER_FAILED. Revoked administrator access stops processing. Never treat job execution as payment/registration approval.
4. Repeat bounded runs to drain remaining eligible work. Unpaid holds expire once; review-held/confirmed money does not expire under the ordinary unpaid rule.

CLI alternative after loading the preview environment:

```sh
LOCAL_OPERATIONS_ACTOR_ID=phase1_preview_admin pnpm exec tsx scripts/run-operational-jobs.mts
```

The ID is the existing fictional local admin account ID, not a secret session token. The runner verifies its Phase7/8 workspace, resolves its database’s real path, rejects sibling/canonical DBs and DB_* overrides, and refuses production mode. The same service authorizes the current admin inside jobs. Do not change the guard to reach a different database.

## Failed notification

A60-second lease allows recovery after a crashed worker. Automatic failures retry with exponential delay starting60 seconds and stop after3 attempts. Expired final leases become audited FAILED records with a deduplicated, in-app-only admin alert. Admin may request at most10 new retry cycles. Inactive recipients/withdrawn optional consent are skipped; essential in-app booking/security records remain. A mock mailbox record means only LOCAL_MOCK delivery, never real email/SMS/push. Do not delete notices or edit counters to make failures disappear.

## Confirmed funds but no ticket

Keep the confirmed payment and its original recipient/evidence history. Do not ask the guest to pay again. Resolve the recorded cause, then use Admin Operations → **Retry eligible issuance** (or the organizer’s eligible retry). Current event, account, registration, BYOB and funds gates must pass. Repeated recovery cannot issue a second ticket. Suspension/cancellation/expiry/revocation must never be bypassed by a manual DB edit.

## Event change, cancellation and refund

Use the existing independently reviewed event-change flow. Pending changes pause bookings/issuance/entry. Cancellation stops admission and preserves financial/history records. Refund review, reported fictional transfer and separate customer acknowledgement are distinct states. A screenshot or acknowledgement is not independent settlement verification. Read EVENT_RESCHEDULING.md and REFUND_OPERATIONS.md; no real transfer belongs in this environment.

## Before any future provider configuration

No provider is connected. Future separately authorized work must define sender/account/recipient identity, protected templates and links, an idempotency key per notification, retry/timeout/delivery-receipt semantics, worker supervision, lease policy, alert destination/owner, account/consent recheck, minimum secret scope, retention and a fictional staging rehearsal. The provider must honor idempotency across crash-after-send; arbitrary external transports cannot promise exactly-once delivery. Do not invent credentials or activate a real sender now.

## Physical phone/entrance checklist — unexecuted

Use a controlled private local network/device and a separately approved safe connection; no tunnel or production deployment. localhost refers to the phone itself, and an ordinary LAN HTTP page may not provide a secure camera context. Do not weaken server bindings or browser security to work around that; arrange an owner-approved private secure local setup first. Record iPhone Safari/Android Chrome, rear-camera permission/focus, dim and bright scenes, readable QR, repeated scans, ID acknowledgement, revoked staff, disconnect/reconnect and manual fallback. Online server approval is required for manual admission too. Stop entry when disconnected; never invent offline acceptance. These physical resources and operator approvals remain outside this local software acceptance.

## Evidence and cleanup

Accepted logs and sanitized JSON are in the canonical docs/phase8. Credentials/mailboxes/databases remain only in private scratch copies. Root DB/branding/historical migration hashes match baseline. Regression3032 and owned disposable database servers are stopped after acceptance; preview3031 remains. Existing Phase6/7 previews were preserved. No scheduled background worker or provider was installed.
