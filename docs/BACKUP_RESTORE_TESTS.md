# Phase 11 update — October 27, 2026

No schema/migration changes. Phase11 reruns populated current SQLite online backup/fresh restore (42 tables,14 migrations), all table/row/schema/migration fingerprints and integrity/FKs; three live copies integrity ok/zero FK violations. Both owned MySQL8.0.41/MariaDB11.8.9 run29+21+9+5 checks and fresh dump/restore with42-table fingerprints,9 migrations and56 FK checks/zero violations. Current evidence: phase11/sqlite-recovery.json, sqlite-integrity.json, mysql-recovery.json, mariadb-recovery.json. Phase10 populated-upgrade/partial-DDL evidence below remains relevant, not relabeled as newly run. No hosted backup or RPO/RTO is certified.

# Phase 10 backup and restore results

October 27, 2026 · isolated fictional localhost databases only. No hosting access.

All three providers were restored into fresh destinations and verified by table counts and deterministic SHA-256 fingerprints of **every column of every row**, including private image bytes, immutable payment recipient snapshots, ticket credentials, check-in/attendance identity, refunds, notifications, audit and migration history. Evidence contains only hashes/counts and migration names/checksums. Raw databases, SQL dumps and credentials stay in private scratch.

| Provider | Backup bytes | Verification | Evidence |
| --- | ---: | --- | --- |
| SQLite | 638976 | 42 tables; integrity ok; zero foreign-key violations; 14 migration records; exact restored records | [SQLite results](phase10/sqlite-recovery.json) |
| MySQL 8.0.41 | See linked measured result | 42 tables, 9 migrations; all fingerprints and FK checks match | [MySQL results](phase10/mysql-recovery.json) |
| MariaDB 11.8.9 | See linked measured result | 42 tables, 9 migrations; all fingerprints and FK checks match | [MariaDB results](phase10/mariadb-recovery.json) |

SQLite backup creation took 0.0089s; fresh restore and validation took 0.0096s for this small fictional dataset. These are measured local durations, **not owner-approved recovery targets**. SQL results record their own combined dump/import/verification time and exact safe location.

SQLite populated rows include User=8, Event=10, EventInvitation=4, InvitationGrant=3, Booking=5, Payment=5, PaymentEvidence=5, PaymentReview=4, Ticket=4, TicketCheckIn=1, AttendanceRecord=1, Refund=1, Notification=46, AdminAuditLog=76, plus fields/staff/recipient versions/private blobs. Registration state and answers are existing Booking columns, not a second registration table. Later E2E support/draft records are intentionally newer than this point-in-time backup.

The final SQL fixture additionally requires nonempty invitations and grants, financial reviews, refunds, admission and audit tables before a backup is accepted. Column fingerprints include the recipient JSON and ticket token; tokens are never printed. All 41 application models and the Prisma migration table are represented. Phase 9's “42 models” description counted one too many: the current schema declares **41 models / 42 tables including _prisma_migrations**. No models were deleted in Phase 10.

## Migration rehearsals

SQLite: read-only online copy of populated Phase8 fictional data; apply the additive current migration; preserve all prior columns/rows across 41 application tables, old migration IDs/checksums, integrity and foreign keys. MySQL/MariaDB: apply eight previous migrations in a fresh upgrade schema, import fictional prior-column projections, apply the ninth migration and compare every old column/row. No destructive migration or production import.

Each provider then receives an intentionally failing migration in a disposable copy. It records one unfinished migration and leaves a partial probe table behind. **Even the observed SQLite migration execution was not an automatic all-or-nothing rollback.** Original business columns/rows remain unchanged; verified backup restoration into a fresh environment removes the failed migration/probe. SQL's independent known-good fresh restore remains separate from the failed upgrade schema; no “mark applied” workaround was used.

Evidence: [SQLite migration recovery](phase10/sqlite-migration-recovery.json), [MySQL](phase10/mysql-migration-recovery.json), [MariaDB](phase10/mariadb-migration-recovery.json). SQL migration checks use a different owned fixture from final SQL backup checks; their original row projections are compared within each rehearsal.

## Guard and failure acceptance

The SQLite helper rejects canonical/sibling paths, missing fictional marker, DB_* overrides, pre-existing destinations/sidecars, corrupt checksums, changed manifest row counts and foreign-key corruption. It uses SQLite's online backup API, so a plain copied main file cannot omit committed WAL pages. Backups/restores are created exclusively with mode0600; directories are private. A checksum proves consistency with its locally trusted manifest, not adversarial authenticity; production encrypted/authenticated storage and key management are still external requirements.

An empty incompatible local schema returned safe503 JSON for five protected API scenarios before any payment/ticket/admission success. A fresh restored DB authenticated the local administrator and read authorized saved reviews without seed/reset: [failure](phase10/http-schema-failure.json), [restored application](phase10/http-restored.json). A missing database connection is also exercised with the actual Prisma client in Phase 10 tests. Startup never silently migrates or repairs this schema.

Hosted backups, retention, key custody, RPO/RTO, off-host failure and actual host restore remain **NEEDS VERIFICATION**. Do not run these helpers against Hostinger or a production restore. See [recovery runbook](DISASTER_RECOVERY_RUNBOOK.md).
