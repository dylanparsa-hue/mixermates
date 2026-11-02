# Current premium reference redesign — 28 October 2026

Open **http://localhost:3091/test-lab**, sign in once, then use **http://localhost:3091/explore**. Canonical source remains `/Users/parsa/Desktop/EVENT FINDER`; the running isolated copy is `/Users/parsa/.codex/tmp/mixermates-correction-20261028/preview`. Its own fictional `prisma/audit.db` and controller credentials are separate from the original database. Original assets and canonical database hashes are unchanged.

The private code is in that preview's `.local/test-lab-access.json`; never paste it into source, reports or screenshots. Restart only after checking3091 is free: `python3 /Users/parsa/.codex/tmp/mixermates-correction-20261028/preview/.local/start-test-lab.py`. The adjacent `Start Premium Preview.command` opens the same loopback-only runner and never resets data. Do not use the default0.0.0.0 dev/start scripts.

Read [premium report](UI_PREMIUM_REPORT.md) and [actual before/after evidence](premium-ui/BEFORE_AFTER.md). The previous3081 correction is preserved as the before baseline. Temporary QA servers3092–3095 were stopped after checks. Production is untouched, real sales remain disabled, Coming Soon remains in place, and owner visual acceptance remains pending.

# Current UI correction Test Lab — October 27, 2026

Use **http://localhost:3081/test-lab** in the fresh `/Users/parsa/.codex/tmp/mixermates-correction-20261027/preview` workspace. The prior 3071 UI was rejected and remains preserved separately. Canonical source is `/Users/parsa/Desktop/EVENT FINDER`; do not run it against its original database.

Private access instructions: `.local/TEST-LAB-ACCESS.txt`; generated code: `.local/test-lab-access.json` in the fresh preview. Use the single Lab entry and its server-backed persona selector. [Owner guide](UI_TEST_LAB_GUIDE.md) and [security](UI_TEST_LAB_SECURITY.md) explain the actual boundaries and workflows.

The preview is left running on 127.0.0.1 only. Restart, if stopped: `python3 /Users/parsa/.codex/tmp/mixermates-correction-20261027/preview/.local/start-test-lab.py`. The adjacent `Start Test Lab.command` is a private convenience launcher. Neither reseeds or resets anything. Do not use the older default dev script that binds 0.0.0.0.

Fresh Lab preparation is `python3 scripts/prepare-test-lab.py --directory /Users/parsa/.codex/tmp/mixermates-correction-YYYYMMDD/preview --port <unused-port>` with a new nonexistent dated workspace. Normal testing never needs database scripts or JSON edits. Never copy its credentials/database into a release.

Regression and browser acceptance use separate owned Phase11 children `ui-correction-regression` (3082) and `ui-correction-access` (3084). The latter was populated by a read-only SQLite backup of the prior fictional UI fixture, not canonical/production data, to preserve the unchanged ten Playwright assertions. The optimized corrected build is an independent local copy on 3083; all Lab entry points return 404 under its production runtime. Temporary QA/build servers can stop after checks; keep the owner preview 3081.

# Historical rejected UI redesign preview — October 27, 2026

Canonical source: `/Users/parsa/Desktop/EVENT FINDER`. UI preview: **http://localhost:3071/admin/login**, then `/explore` after authorized admin sign-in. Organizer/staff entry: **http://localhost:3071/organizer/login**. Workspace: `/Users/parsa/.codex/tmp/mixermates-phase11-20261027/ui-preview`, with its own fictional `prisma/audit.db`. The earlier Phase11 preview on3061 is preserved.

Private local administrator credentials are in `ui-preview/.local/admin-access.json`; do not copy them into chat, source, screenshots or public artifacts. The seeded organizer/staff credentials remain fictional test accounts. Ordinary discovery stays behind Coming Soon; real sales remain disabled. UI work does not enable real customer access.

Runtime helper: `/Users/parsa/.codex/tmp/mixermates-ui-20261027/run.py`. It clears inherited DB_* values and uses only an allowlisted contained file database. To restart the development preview:

```sh
python3 /Users/parsa/.codex/tmp/mixermates-ui-20261027/run.py ui-preview pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3071
```

Run only after checking that this owned server is not already listening. The default package dev/start commands bind0.0.0.0 and should not be used for this work. Do not run migrations/tests against canonical `prisma/dev.db`.

The sibling `ui-baseline` on3072 is a separate full-platform fictional regression copy; it passed the unchanged353-test suite. `ui-build` on3074 is an isolated optimized-runtime smoke copy. They are not release/deployment targets. The main preview remains3071. The guarded source browser harness is `scripts/ui-redesign-qa.mjs`; it requires this exact owned preview, explicit fictional data and disabled sales. Additional Phase11 harness copies were adapted inside the scratch preview for the UI port and evidence directory; original Phase11 scripts/tests were preserved.

See [UI_REDESIGN_REPORT.md](UI_REDESIGN_REPORT.md), [UI_ANIMATION_SPEC.md](UI_ANIMATION_SPEC.md), [UI_BEFORE_AFTER.md](UI_BEFORE_AFTER.md) and `docs/ui-redesign/` for historical rejected evidence. The current correction is documented above. No deployment, production access, external messages or next backend phase is authorized.

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

SQLite runtime defaults to one connection for demonstrated local contention, preserving explicit URL options. MySQL/MariaDB provider clients are isolated in their own workspace. Both owned SQL daemons and optimized/outage/acceptance/load servers are stopped; preview3051 stays. Original Phase9 preview3041 is preserved. Local optimized builds use independent copies; `next start` smoke uses the installed dependency tree, not a portable standalone release package.

Recovery: DISASTER_RECOVERY_RUNBOOK.md and BACKUP_RESTORE_TESTS.md. All copied dumps/databases are fictional/private and remain in scratch; do not attach or upload them. Operational CLI accepts Phase10 but still requires its contained database and existing fictional administrator ID. No real delivery provider or background production job is enabled.

# Current Phase 9 isolated preview — October 27, 2026

Canonical source remains `/Users/parsa/Desktop/EVENT FINDER`; verified identical to Phase8 at entry. New preview: **http://localhost:3041/organizer/login**, admin `/admin/login`, customer `/my-bookings`. Workspace `/Users/parsa/.codex/tmp/mixermates-phase9-20261027/preview` has its own fictional SQLite audit.db, Coming Soon, disabled real sales and explicit local customer adapter. No root dev.db use/migration. Private admin credentials remain in that workspace's `.local/admin-access.json`.

Restart only if3041 is free: choose Node22.23.3, change into preview, clear DB_PASSWORD/DB_NAME/DB_USER/DB_HOST/DB_PORT, privately load only that preview's .env, then `pnpm exec next dev --hostname 127.0.0.1 --port 3041`. Never use default scripts binding0.0.0.0. Required flags retain SITE_MODE=coming_soon,TICKET_SALES_MODE=disabled,DEMO_MODE=false,LOCAL_DEMO_BOOKING_ENABLED=false,ISOLATED_TEST_DATA=true,LOCAL_CUSTOMER_TEST_ENABLED=true and both HOSTINGER flags false. These test flags are not release settings.

Regression is sibling `regression` on3042 (stopped after acceptance). Load only its own environment and start loopback next dev3042. Tests need TEST_BASE_URL=http://localhost:3042, ACCESS_TEST_BASE_URL=http://localhost:3041, ACCESS_TEST_DATABASE_URL=file:/Users/parsa/.codex/tmp/mixermates-phase9-20261027/preview/prisma/audit.db and ACCESS_ADMIN_CREDENTIAL_FILE=/Users/parsa/.codex/tmp/mixermates-phase9-20261027/preview/.local/admin-access.json; then pnpm test. Build copies are independent; mysql-workspace has a MySQL client and must not be used as a SQLite server.

There are14 SQLite and9 MySQL migrations. `scripts/backfill-phase9.mts` accepts only the calling Phase9 fictional SQLite DB and rejects other paths/DB_* overrides/production. It fingerprints legacy receipts and stores searchable holder names without changing old financial/history columns. Populated upgrade was rehearsed in sibling upgrade. No reset is required. Current worker CLI supports Phase9, checks its own resolved DB and remains local/mock only. See LOCAL_OPERATIONS_RUNBOOK.md and PHASE_9_REPORT.md.

# Current Phase 8 isolated preview — October 27, 2026

Canonical latest source: `/Users/parsa/Desktop/EVENT FINDER`. Review preview: **http://localhost:3031/organizer/login**; admin `/admin/login`; customer `/my-bookings`. Preview workspace `/Users/parsa/.codex/tmp/mixermates-phase8-20261027/preview` has its own fictional audit.db, Coming Soon, disabled real sales, no demo switcher, explicit isolated customer adapter and loopback binding. Prior Phase6/7 servers were preserved. Do not use root `prisma/dev.db` with the current client.

Restart exactly as LOCAL_OPERATIONS_RUNBOOK.md: choose Node22.23.3, change into that preview, clear DB_*, load only its own .env without displaying it, and run `pnpm exec next dev --hostname 127.0.0.1 --port 3031`. Check the port first. Private administrator credentials remain in preview `.local/admin-access.json`; never include them in evidence.

Regression is sibling `regression`, port3032, its own full_platform/DEMO_MODE/LOCAL_DEMO_BOOKING_ENABLED/ISOLATED_TEST_DATA/LOCAL_CUSTOMER_TEST_ENABLED=true fictional data. It is stopped after acceptance. Restart it with its own .env and explicit loopback command. Run tests from that directory with TEST_BASE_URL=http://localhost:3032, ACCESS_TEST_BASE_URL=http://localhost:3031, ACCESS_TEST_DATABASE_URL=file:/Users/parsa/.codex/tmp/mixermates-phase8-20261027/preview/prisma/audit.db and ACCESS_ADMIN_CREDENTIAL_FILE=/Users/parsa/.codex/tmp/mixermates-phase8-20261027/preview/.local/admin-access.json. Clear DB_* first. Accepted `pnpm test`:302 pass,0 fail/skip/cancelled. `pnpm typecheck` and both schemas validate.

Build siblings `build` (SQLite) and `mysql-workspace` (MySQL client) are separate from running servers. Use NODE_ENV=production for `pnpm exec next build --webpack`; do not build over preview .next or share generated clients between providers. The MySQL/MariaDB services used brand-new owned data directories, sequentially on allowlisted loopback13306; both are stopped. Their private local credentials stay outside source. Never substitute hosting credentials, old restored customer data or an arbitrary provider port.

Source baseline is preserved at scratch `baseline`; no Git repository/remote was initialized. No schema changes:13 SQLite/eight MySQL migrations retained. Fresh workspaces still use scripts/prepare-local-audit.py with new nonexistent destinations; run .mjs scripts importing TypeScript through `pnpm exec tsx`, not bare Node. New guarded browser/performance/provider harnesses are scripts/phase8-*. Do not reset accepted fixtures just to repeat captures; retain history or create a new isolated workspace. Operations CLI is updated for the new workspace and rejects sibling DBs. See PHASE_8_REPORT.md and LOCAL_OPERATIONS_RUNBOOK.md. No deploy/tunnel/real-message action is part of this procedure.

# Current Phase 7 isolated preview — October 27, 2026

Canonical existing source: `/Users/parsa/Desktop/EVENT FINDER`. Active new isolated preview: `/Users/parsa/.codex/tmp/mixermates-phase7-20261027/preview`, http://localhost:3021 (bound to 127.0.0.1). Existing Phase6 port3011/Phase5 port3001 were preserved. Coming Soon and real-sales-disabled flags remain. Private credentials reside only in the preview's `.local/admin-access.json`; do not paste or commit them.

To restart: use the Node22 runtime already provisioned under `/Users/parsa/.codex/tmp/mixermates-phase1-20261019/node22/node-v22.23.3-darwin-arm64/bin`, change into the isolated preview, load its local `.env` without printing it, then `pnpm exec next dev --hostname 127.0.0.1 --port 3021`. Keep its existing SQLite client/database. Do not run migration/seed/test against canonical `prisma/dev.db`. Operational worker command and limits: NOTIFICATION_DELIVERY.md. Admin Operations can run the same local jobs with session authorization.

Regression uses separate SQLite copy/port3022; build uses another copy with separately generated provider clients; MySQL used its own fresh disposable data directory on loopback13306. Regression/MySQL processes are stopped after acceptance; preview stays available. Do not reuse a production URL or earlier restore. Test commands need TEST_BASE_URL for regression and ACCESS_TEST_BASE_URL, ACCESS_TEST_DATABASE_URL and private ACCESS_ADMIN_CREDENTIAL_FILE for the Coming Soon access suite. All values must name their isolated local copies. Existing historical startup directions below may name earlier phases.

# Current Phase 6 local environment — October 26, 2026

Canonical source: `/Users/parsa/Desktop/EVENT FINDER`. Active isolated preview: `/Users/parsa/.codex/tmp/mixermates-phase6-20261026/preview` at **http://localhost:3011/organizer/login**. Admin `/admin/login`; customer `/my-bookings`. The existing Phase 5 server on3001 was preserved. Anonymous public view is Coming Soon. Root original `prisma/dev.db` remains unchanged; never use its old schema with the current client.

Restart only if3011 is free; preserve unrelated processes:

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase6-20261026/preview
export PATH="/Users/parsa/.codex/tmp/mixermates-phase1-20261019/node22/node-v22.23.3-darwin-arm64/bin:/Users/parsa/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
unset DB_PASSWORD DB_NAME DB_USER DB_HOST DB_PORT
export DATABASE_URL="file:$PWD/prisma/audit.db" APP_ORIGIN="http://localhost:3011"
export SITE_MODE=coming_soon TICKET_SALES_MODE=disabled DEMO_MODE=false
export LOCAL_DEMO_BOOKING_ENABLED=false ISOLATED_TEST_DATA=true LOCAL_CUSTOMER_TEST_ENABLED=true
export HOSTINGER_DATABASE_BOOTSTRAP=false HOSTINGER_SEED_DEMO=false
pnpm exec next dev --hostname 127.0.0.1 --port 3011
```

These flags are only for the fictional local adapter; never copy them into a release. Private admin credentials are in preview `.local/admin-access.json`. The existing seed organizer/staff/customer accounts are fictional. No credentials are included in public docs. Refund examples and transfer receipt confirmations are explicitly fictional; no bank transfer occurred.

Regression uses sibling `regression` on127.0.0.1:3012 and its own audit.db with SITE_MODE=full_platform, DEMO_MODE/LOCAL_DEMO_BOOKING_ENABLED/ISOLATED_TEST_DATA/LOCAL_CUSTOMER_TEST_ENABLED=true. To repeat pnpm test there, set TEST_BASE_URL=http://localhost:3012, ACCESS_TEST_BASE_URL=http://localhost:3011, ACCESS_TEST_DATABASE_URL=file:/Users/parsa/.codex/tmp/mixermates-phase6-20261026/preview/prisma/audit.db and ACCESS_ADMIN_CREDENTIAL_FILE=/Users/parsa/.codex/tmp/mixermates-phase6-20261026/preview/.local/admin-access.json; clear DB_* first. Run typecheck after compilation settles. Use the sibling build copy for optimized builds and separate provider generation; its last client is MySQL, so regenerate SQLite before using its audit.db.

Fresh preparation still uses scripts/prepare-local-audit.py with a nonexistent destination, now12 SQLite migrations. scripts/prepare-phase4-fixture.mjs plus phase6-browser-fixture.mts create the protected fictional rehearsal and two starting bookings. Do not reset an accepted fixture just to recapture. Browser harnesses are phase6-browser.mjs and phase6-notification-browser.mjs; MySQL acceptance uses a brand-new owned data directory/schema, not an earlier production restore. No hosted helper is part of local startup. Regression and disposable MySQL are stopped after acceptance; preview3011 remains for review. Full results/limitations: PHASE_6_REPORT.md.

# Current Phase 5 local environment — October 26, 2026

Canonical source: `/Users/parsa/Desktop/EVENT FINDER`. Its application code matched the Phase 4 workspace before changes. New isolated preview: `/Users/parsa/.codex/tmp/mixermates-phase5-20261026/preview`; regression: sibling `regression`; isolated compiler/provider copies: `build` and `mysql-workspace`. Original root `prisma/dev.db` is preserved and must not be used with the updated client. No production credentials or restored production/customer data were used.

Open http://localhost:3001/organizer/login, then `/organizer?tab=Entrance&event=halloween-phase4-test`; scoped customer history is `/my-bookings`. Anonymous users see Coming Soon. Use the fictional seeded accounts only. Local admin access is privately stored in the preview `.local/admin-access.json`; do not publish it. Acceptance revokes the fictional staff assignment at the end: organizer must reassign that user before another camera rehearsal.

Restart only if port 3001 is free; preserve any unrelated process:

```sh
cd /Users/parsa/.codex/tmp/mixermates-phase5-20261026/preview
export PATH="/Users/parsa/.codex/tmp/mixermates-phase1-20261019/node22/node-v22.23.3-darwin-arm64/bin:$PATH"
unset DB_PASSWORD DB_NAME DB_USER DB_HOST DB_PORT
export DATABASE_URL="file:$PWD/prisma/audit.db"
export APP_ORIGIN="http://localhost:3001"
export NODE_ENV=development SITE_MODE=coming_soon TICKET_SALES_MODE=disabled
export DEMO_MODE=false LOCAL_DEMO_BOOKING_ENABLED=false ISOLATED_TEST_DATA=true
export LOCAL_CUSTOMER_TEST_ENABLED=true
export HOSTINGER_DATABASE_BOOTSTRAP=false HOSTINGER_SEED_DEMO=false
pnpm exec next dev --hostname 127.0.0.1 --port 3001
```

These customer-test flags are strictly for this isolated fictional preview. They do not activate real sales and must not be copied to a release. Do not run the default pnpm dev/start scripts because their historical host binding is 0.0.0.0. Never open a public tunnel.

For full regression, start the sibling regression server on 127.0.0.1:3002 using its own `.env` and file database, with explicit full_platform/DEMO_MODE/LOCAL_DEMO_BOOKING_ENABLED/ISOLATED_TEST_DATA/LOCAL_CUSTOMER_TEST_ENABLED=true. Run pnpm test there with TEST_BASE_URL=http://localhost:3002, ACCESS_TEST_BASE_URL=http://localhost:3001, ACCESS_TEST_DATABASE_URL=file:/Users/parsa/.codex/tmp/mixermates-phase5-20261026/preview/prisma/audit.db, ACCESS_ADMIN_CREDENTIAL_FILE=/Users/parsa/.codex/tmp/mixermates-phase5-20261026/preview/.local/admin-access.json. Clear DB_* overrides and explicitly load only that regression environment. The access helper mints sessions at the current persisted securityVersion, so fixture staff updates do not invalidate its intended valid-session test.

Run typecheck after builds have settled. Use the separate build copy for `pnpm exec next build --webpack`; do not build over a running server's .next. Local MySQL acceptance used a brand-new data directory at `mixermates-phase5-20261026/mysql/data`, 127.0.0.1:13306 and a fictional disposable schema. No existing Phase 4 restoration data was read. No schema changes were needed in Phase 5. The MySQL daemon is stopped after acceptance; preview remains SQLite and does not require it.

Fresh repeat preparation reuses scripts/prepare-local-audit.py with a nonexistent destination. scripts/prepare-phase4-fixture.mjs creates the separate fictional Halloween event; scripts/phase5-browser-fixture.mts completes its fictional evidence/funds/registration flow and saves private test identifiers in .local. Browser and MySQL harnesses are scripts/phase5-captures.mjs and scripts/phase5-mysql.mts; they require explicit isolated targets. Do not reset saved acceptance fixtures or the real event draft just to rerun a capture; use a fresh isolated copy and unused test tickets. No hosting helper is part of this workflow.

PHASE_5_REPORT.md records accepted checks. Earlier environment locations below are historical.

# Safe local development

## Current Phase 4 status — October 20, 2026

Phase 4 preview http://localhost:3001 uses /Users/parsa/.codex/tmp/mixermates-phase4-20261020/workspace/prisma/audit.db; regression and build copies are siblings. Private invitation/admin files stay under .local. Do not use the updated Prisma client against the original project database. A disposable MySQL 8.0.41 service was bound only to 127.0.0.1:13306 for isolated tests; it is not hosting. Restore connection settings after copying a workspace: inherited absolute DATABASE_URL is unsafe. See CUSTOMER_BOOKING_AND_PAYMENT.md.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

Updated October 20, 2026. Follow DEPLOYMENT_POLICY.md first. Use pnpm and the existing Next/React/Prisma versions. Never import production credentials. Do not run Hostinger bootstrap/build helpers for local development.

## Current Phase 3 workspace

Preview: `/Users/parsa/.codex/tmp/mixermates-phase3-20261020/workspace` at **http://localhost:3001/coming-soon**. Organizer sign-in: `/organizer/login`; admin: `/admin/login`. Preview uses Coming Soon mode, own migrated `prisma/audit.db`, explicit isolated test data and disabled real sales. It is loopback-only. Root `prisma/dev.db` remains the preserved old schema: do not run the updated client against it. If restarting, run `pnpm exec next dev --hostname localhost --port 3001` from the Phase 3 workspace only; do not replace an occupied process.

Regression copy: `/Users/parsa/.codex/tmp/mixermates-phase3-20261020/regression`, separate fictional database, full_platform explicit demo flags; port 3002 stopped after acceptance. The test environment must load only that copy's settings, with TEST_BASE_URL=localhost:3002 and ACCESS_TEST_BASE_URL=localhost:3001, ACCESS_TEST_DATABASE_URL pointing to the Phase 3 preview audit.db and ACCESS_ADMIN_CREDENTIAL_FILE pointing to its `.local/admin-access.json`. Never print/share private files or copy flags into production. The full suite passed 167/167. Last typecheck passes.

Separate build copy: `/Users/parsa/.codex/tmp/mixermates-phase3-20261020/build`. Node 22.23.3, no production environment/private data. Both provider builds pass; last generated client is MySQL with compilation-only localhost placeholder. Do not use that client against SQLite. Ten migrations, fresh fictional seed and guarded alignments are tested. `scripts/prepare-local-audit.py` now runs both Halloween alignment steps after seed; choose a new destination. Do not seed or migrate the original root DB. Historical locations below are retained for evidence and are superseded by this section.

## Historical Phase 2 workspace — October 20, 2026

Current preview: `/Users/parsa/.codex/tmp/mixermates-phase2-20261019/workspace`, localhost:3001. It has its own copied/migrated `prisma/audit.db`, private local admin file, Coming Soon mode, DEMO_MODE=false and disabled sales. Start, only if the existing preview process is stopped, with `pnpm exec next dev --hostname localhost --port 3001` from that workspace. The root original dev.db was deliberately not migrated; do not run the updated Prisma client against that old original schema.

Regression copy: `/Users/parsa/.codex/tmp/mixermates-phase2-20261019/regression`, own fictional SQLite, previously on localhost:3002 and now stopped. It uses full_platform plus DEMO_MODE/ISOLATED_TEST_DATA/LOCAL_DEMO_BOOKING_ENABLED=true for explicit fictional demo tests only. Never copy these flags to production. Start it with the explicit loopback Next command on port 3002, load only its `.env` into the test terminal, and set TEST_BASE_URL to that same port. The Phase 2 test file requires guarded isolated local targets.

For the accepted full suite, also set ACCESS_TEST_BASE_URL=http://localhost:3001, ACCESS_TEST_DATABASE_URL to the **preview** audit.db file URL, and ACCESS_ADMIN_CREDENTIAL_FILE to the preview `.local/admin-access.json`. Then `pnpm test` and `pnpm typecheck` from regression. Do not print credentials or mailbox files. Stop the regression server when finished. Required results/logs are in docs/phase2.

Separate build copy: `/Users/parsa/.codex/tmp/mixermates-phase2-20261019/build`. It contains no production credentials. Provider-client generation/build can run there without racing the preview's generated types. The last build uses a MySQL client and a dummy localhost URL solely for compilation; no MySQL database exists at that URL. Both provider builds were tested on Node 22.23.3. No hosting helper or release ZIP packager was run in Phase 2.

Fresh fictional preparation uses the latest nine SQLite migrations. Run the guarded `scripts/align-halloween-fixture.mjs` only with an explicit isolated file DATABASE_URL and ISOLATED_TEST_DATA=true. Existing fixture times/tier capacity remain historical/unconfirmed; no source unknown is permission to publish. Never use production database credentials in this workflow.

The setup examples below retain Phase 0/1 history. Prefer the current Phase 2 locations above and the same loopback/isolation guards. The original port 3000 is not the acceptance target.

## Current verified locations

| Purpose | Location |
| --- | --- |
| Main source | `/Users/parsa/Desktop/EVENT FINDER` |
| Existing local app | `http://localhost:3000` (existing loopback server retained) |
| Original local SQLite | `prisma/dev.db` in main source; preserve existing records |
| Isolated Phase 0 source | `/Users/parsa/.codex/tmp/mixermates-phase0-20261019/workspace` |
| Isolated audit database | `/Users/parsa/.codex/tmp/mixermates-phase0-20261019/workspace/prisma/audit.db` |
| Phase 0 app | Stopped; its source/database/evidence retained |
| Current Phase 2 preview | `http://localhost:3001/coming-soon` — phase2 workspace, localhost only |
| Phase 2 regression | Used `http://localhost:3002` with separate fictional data; stopped after tests |
| Audit logs | `/Users/parsa/.codex/tmp/mixermates-phase0-20261019/` |

Port 3000 was already in use, so Phase 0 selected unused port 3001 after checking it. Do not assume a free port or replace an existing process. If 3001 is occupied in future, choose another loopback port and update APP_ORIGIN, TEST_BASE_URL and commands together.

## Prerequisites and dependency install

Node 22 and pnpm. This Mac has Codex's bundled runtime; if a normal node/pnpm is unavailable:

```sh
export PATH="/Users/parsa/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export PATH="/Users/parsa/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
```

The Phase 0 isolated install succeeded with `pnpm install --frozen-lockfile --offline --ignore-scripts`, using 134 cached packages and no upgrades. Then Prisma generate was run explicitly. An offline cache miss requires an approved normal registry install of the same frozen lockfile; do not upgrade packages or change the framework to fix cache availability. Node_modules must exist inside the isolated workspace; a symlink to the main source is rejected by Turbopack's filesystem boundary.

## Preferred fresh disposable workspace

From the main source:

```sh
cd "/Users/parsa/Desktop/EVENT FINDER"
python3 scripts/prepare-local-audit.py
```

This new preparation helper copies source into a new temporary workspace, excludes .env files, databases, private/public uploads, node_modules and builds, installs the frozen dependency set offline, generates the SQLite Prisma client, creates an empty DB, applies the existing migrations and seeds fictional data. It rejects an existing destination, clears DB_* overrides and disables hosting bootstrap. It starts no server and performs no deployment. `--directory /absolute/new/path` optionally chooses a nonexistent destination. The underlying preparation steps were exercised in Phase 0; the added helper is also checked with --help and an isolated execution.

Keep all mutations in that disposable directory. Do not run seed/reset/migrate commands against the original database or any production connection. Demo credentials are fictional local fixtures; use the local demo account switcher rather than copying credentials into docs. Production demo switching is disabled by code.

## Start the already prepared audit workspace

In a new terminal:

```sh
cd "/Users/parsa/.codex/tmp/mixermates-phase0-20261019/workspace"
unset DB_PASSWORD DB_NAME DB_USER DB_HOST DB_PORT
export DATABASE_URL="file:$PWD/prisma/audit.db"
export APP_ORIGIN="http://localhost:3001"
export TEST_BASE_URL="http://localhost:3001"
export DEMO_MODE=true
export HOSTINGER_DATABASE_BOOTSTRAP=false
export HOSTINGER_SEED_DEMO=false
pnpm exec next dev --hostname 127.0.0.1 --port 3001
```

Open `http://localhost:3001/explore`. The original app's pnpm dev and scripts/dev.sh bind 0.0.0.0; use the explicit loopback command above under the current policy. Do not run cloudflared or share a public tunnel. Ctrl+C stops only the process in that terminal; preserve other development sessions.

## Local database configuration

Root schema is SQLite. In a fresh disposable workspace only:

```sh
unset DB_PASSWORD DB_NAME DB_USER DB_HOST DB_PORT
export DATABASE_URL="file:$PWD/prisma/audit.db"
python3 -c 'import sqlite3; sqlite3.connect("prisma/audit.db").close()'
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec tsx prisma/seed.ts
```

Creating the empty SQLite file avoids a local Prisma engine error observed when the file did not yet exist. Seven current SQLite migrations applied successfully. Seed creates fictional organizer/admin/staff/attendees, seven events, badges and clubs; it is not real Halloween configuration. Do not use MySQL migrations against SQLite or regenerate a MySQL client in the shared source during local testing. Realistic MySQL concurrency/migration validation needs a separate local MySQL instance in a later phase; none was available/configured in this phase.

## Run tests safely

Keep the audit server running. In a second terminal, **repeat the isolated cd and environment exports from above**. Verify DATABASE_URL starts with file: and TEST_BASE_URL is localhost/127.0.0.1 at the matching audit port. Then:

```sh
pnpm typecheck
pnpm test
pnpm exec next build --webpack
```

The build is local artifact generation only, not a deployment. Existing Node tests require the running API and directly inspect the same isolated database. They create and clean synthetic records; never point them to mixermates.com. Phase 1 tests now enforce loopback, explicit isolated data and SQLite; access tests are additional and need their explicit ACCESS_* configuration. Phase 0 ran 36 tests successfully, TypeScript passed and local build passed. Fresh seed before tests is important because fixture assumptions include the expected seven events and demo staff/admin accounts.

Optional Playwright specs are present but were not executed in Phase 0; current h1 selector is stale. Repair them before relying on `pnpm test:e2e`. Do not install extra browser automation merely to claim coverage; use the approved browser tooling and TEST_PLAN.md. Physical-device camera and real MySQL tests are separate release gates.

## Environment inventory and safety

Local: DATABASE_URL, DEMO_MODE, PLATFORM_FEE_BPS (demo-only default), APP_ORIGIN and optional NEXT_PUBLIC_MAP_STYLE_URL. No secrets are documented. System/provider-only variables include DB_*, HOSTINGER_DATABASE_BOOTSTRAP, HOSTINGER_SEED_DEMO; keep unset/false locally. Local file DBs and production MySQL are distinct. MySQL credentials override DATABASE_URL if DB_PASSWORD/DB_NAME/DB_USER are set, which is why clearing them is mandatory.

No migrations for the new payment/access model were created in Phase 0. Proposed future additive migrations are described in PROJECT_AUDIT.md. Phase 0 preserved application source; Phase 1 intentionally adds the access layer and Coming Soon. Original assets/schema remain unchanged; local builds never imply publishing permission.

## Phase 1 environments and reproducibility

Current review URL: http://localhost:3001/coming-soon. Local admin entry: http://localhost:3001/admin/login. Preview workspace: /Users/parsa/.codex/tmp/mixermates-phase1-20261019/preview (its own SQLite audit.db). Regression workspace: /Users/parsa/.codex/tmp/mixermates-phase1-20261019/regression, loopback port 3002, separate audit.db. These are separate from original prisma/dev.db. Neither is publicly reachable through a tunnel. Servers must bind 127.0.0.1.

Preview: SITE_MODE=coming_soon, TICKET_SALES_MODE=disabled, DEMO_MODE=false, bootstrap/seed false, DB_* cleared and DATABASE_URL explicitly the preview file. The source .env.example now defaults to Coming Soon, no demo mutations. The final source must never be switched to full_platform against production.

To preserve old fictional demo regression behavior only: SITE_MODE=full_platform, DEMO_MODE=true, LOCAL_DEMO_BOOKING_ENABLED=true, ISOLATED_TEST_DATA=true, nonproduction process, SQLite file and loopback request origin are all mandatory. No one flag enables real sales. Tests create fake bookings/tickets only in the regression fixture DB. These existing demo records do not certify admission or payment. Do not use NODE_ENV=production for fictional demo mutations.

For a fresh local ADMIN fixture after preparing/seeding a new isolated workspace: run scripts/provision-local-admin.mjs with ISOLATED_TEST_DATA=true, a file: DATABASE_URL and DB_* cleared. It refuses production/MySQL and duplicate credentials, generates a random bcrypt-protected account and writes .local/admin-access.json privately (0600). This local-only credential file is not included in archives. Open it privately to sign in; do not paste credentials into chat. The dedicated /admin/login accepts active ADMIN only, not profile verification or seeded production .demo identities. Existing authenticated organizer/staff sessions retain narrow management scope; a new public organizer auth flow is outside Phase 1.

Full test command uses TEST_BASE_URL=http://localhost:3002 and DATABASE_URL pointing at regression/audit.db, ISOLATED_TEST_DATA=true, plus ACCESS_TEST_BASE_URL=http://localhost:3001, ACCESS_TEST_DATABASE_URL pointing at preview/audit.db and ACCESS_ADMIN_CREDENTIAL_FILE pointing at preview/.local/admin-access.json. pnpm test without ACCESS_TEST_BASE_URL explicitly skips the access suite; that skipped run is not Phase 1 acceptance. The accepted run had 116 pass / 0 fail / 0 skipped.

Run pnpm typecheck and pnpm exec next build --webpack with local SQLite and bootstrap/seed false. For the candidate, scripts/package-coming-soon.py writes only a local sanitized ZIP; unpack in another scratch folder, install frozen dependencies, then pnpm run build (MySQL client generation with nonconnecting build-only placeholder). Do not regenerate MySQL client in the SQLite regression workspace. Candidate Node 22 runtime checks and local build evidence are recorded in TEST_RESULTS.md. A local build is not a hosted deployment or MySQL connectivity test.

The updated preparation helper accepts --mode coming_soon (default) or --mode full_platform for isolated fictional regression, plus --port. It excludes .local credential directories and writes explicit safe bootstrap/sales settings. Existing Phase 0 workspace/evidence remains intact.

After acceptance, scratch regression (3002) and standalone smoke (3003) servers were stopped. The gated preview on 3001 remains running for owner review.
