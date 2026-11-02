# Phase 11 update — October 27, 2026

Recovery helper now permits exactly the owned Phase10 or Phase11 direct-child workspace namespaces, requires the matching `.local/phase11-isolated.json` for Phase11 (fictional=true,phase=11), resolves all paths within that same workspace, rejects DB_* overrides/canonical/sibling/preexisting/corrupt destinations and never overwrites. Use `/Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview` and new contained filenames for current local backups/restores; retain failed DB. Phase10 commands below are historical valid examples. Current safe runner and exact paths: LOCAL_DEVELOPMENT.md; incidents/backup ownership/retention/provider plan: OPERATIONS_HANDOVER.md. No production recovery action is authorized.

# Local disaster recovery runbook

**Phase 10 fictional localhost use only. This is not an executable production rollback authorization.** Never use production credentials/data, overwrite a database or reset records to make an incident disappear.

## Before a local recovery

1. Use the exact owned Phase 10 workspace. Stop new admissions/reviews on the affected test server. Save the current failure time and operation/reference without copying receipt bytes or ticket/session credentials.
2. Clear every DB_* variable. DATABASE_URL must resolve inside that same workspace. Keep HOSTINGER_DATABASE_BOOTSTRAP=false, HOSTINGER_SEED_DEMO=false and TICKET_SALES_MODE=disabled. APP_ORIGIN must be loopback. Use Node 22.23.3; worker tests require NODE_ENV=development and ISOLATED_TEST_DATA=true.
3. Confirm `.local/phase10-isolated.json` contains exactly `{"fictional":true,"phase":10}`. The helper independently enforces the resolved workspace/path boundaries and refuses sibling/canonical destinations. Do not fabricate a marker to operate on an unrelated database.
4. Choose new filenames and a trusted protected location under `.local/recovery`. The backups are fictional but still contain session/password hashes and private ticket/image records; keep the whole scratch tree private and do not attach raw files to reports.

## Back up and verify SQLite

From the canonical source, the following reads only the named fictional preview. Pick a new destination filename for each backup:

```sh
python3 scripts/local-recovery.py backup \
  --workspace /Users/parsa/.codex/tmp/mixermates-phase10-20261027/preview \
  --source /Users/parsa/.codex/tmp/mixermates-phase10-20261027/preview/prisma/audit.db \
  --destination /Users/parsa/.codex/tmp/mixermates-phase10-20261027/preview/.local/recovery/new-fictional-backup.db
```

Run `verify` with the same workspace/source pointing to that backup and no destination. Retain its sibling `.json` manifest. It records time/provider/size/checksum, schema hash, migration names/checksums, integrity, foreign keys and table counts/fingerprints. Both the raw file and trusted manifest matter. Never treat exit0 alone as proof of business data preservation.

## Restore SQLite into a fresh destination

Use `restore` with `--source` equal to the backup and `--destination` a **nonexistent** path under the same owned workspace. The helper verifies file and record fingerprints before and after restoration and refuses overwrite. It preserves the failed database for diagnosis. Start an isolated process with DATABASE_URL naming the new file, not the old failure file; do not migrate/seed automatically.

Confirm every expected migration, integrity/FK result, Booking lifecycle/payment/registration state, independent review, original recipient snapshot, Ticket identity/status, check-in, unique private AttendanceRecord, Refund history, notifications and audit fingerprints. Then authenticate privately, read the saved booking and test a disposable retry through the existing service. A restored already-used ticket must remain used. An uncertain pre-outage admission must be checked against saved attendance before retry, never accepted offline.

## Disposable MySQL/MariaDB procedure

Only the owned Phase 10 daemons on127.0.0.1:13306 are allowed. The isolated test account/database allowlist is enforced in application test helpers. Their private local credentials stay in mode0600 files; don't put a password on a command line, in SQL filenames or in documentation. The harness authenticates bootstrap/dump/import through its owned private Unix socket, not a hosting endpoint.

The executed provider runner is `/Users/parsa/.codex/tmp/mixermates-phase10-20261027/run-sql-final.py`: it creates entirely new owned data directories, applies nine migrations, runs29 retained Phase 9 cases,21 runtime checks and9 Phase 10 cases, takes a `--single-transaction --hex-blob --no-tablespaces` dump, imports into a newly created restore schema and compares `scripts/phase10-provider-snapshot.mts` outputs. MySQL and MariaDB use their matching dump/client binaries. Services stop in `finally`. **Do not rerun a completed runner over its existing directories or change it to reuse arbitrary data; create a new isolated run namespace.** A separate migration rehearsal preserves old-column projections and demonstrates failed DDL in each provider.

Logical dumps require a consistent supported transactional-engine boundary. The test harness had no concurrent schema writes. Real hosted privileges, triggers/routines, collation/version differences, filesystem backups, binary logs and point-in-time recovery were not certified. Do not extrapolate SQLite file replacement to MySQL rollback.

## Incident response by symptom

- **Database unavailable / incompatible:** stop admissions and financial decisions. The API returns503 without SQL/connection details; it cannot reliably persist a failure alert to the database that is itself down. Check the local process and correct isolated URL/schema. Restore known-good data to a new environment if needed. Production requires independent external monitoring.
- **Funds confirmed, ticket absent:** preserve Payment/PaymentReview/evidence/recipient and registration state. Do not ask the guest to pay again. Resolve the failure, then use Admin Operations → Retry eligible issuance. Exactly one eligible ticket may exist; suspension/cancellation/registration requirements still apply.
- **Worker interrupted:** keep the claimed row. Re-run the authorized local worker after its60-second lease. Retry delays start60 seconds, three attempts maximum; final expired leases become FAILED with one in-app admin alert. Manual retry is authorized, audited and bounded. A local mailbox file is not an email delivery receipt.
- **Wrong/duplicate/uncertain admission:** stop the line for that credential; refresh server history. Keep a committed historical arrival; never invent a rollback or a second Passport stamp. Staff revocation/suspension blocks later requests.
- **Failed migration:** preserve logs/failed DB; stop dependent operations. A probe DDL table remained after the injected failures on all three providers. Restore a verified pre-failure backup to a fresh DB and use a known compatible source/schema. Never silently delete history, run a reset, or mark a failed migration applied to obtain a green result.
- **Cancellation/refund:** use existing authorized state transitions. A reported external transfer and customer acknowledgement remain different from independently verified bank settlement.

Record impact, owner, safe operation references, timeline, recovery source/schema/hash, record checks, duplicate checks and unresolved cause. Do not restart sales or move to production. The owner must appoint actual incident/backup/door/finance contacts and approve recovery objectives before a real event.
