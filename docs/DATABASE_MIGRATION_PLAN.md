# Phase 2 database migration and preservation

## Current Phase 4 status — October 20, 2026

Phase4 adds Booking.reviewHold and PaymentReview receivedAmount/recipientVersionId through both provider tracks, retaining40models. SQLite11migrations and MySQL6migrations (different historical tracks) pass fresh and populated-upgrade rehearsals. MySQL8.0.41 found invalid old TEXT literal defaults:21historical expressions corrected and introspected schema default annotations aligned, yielding empty migrate diff. Before/after hashes are retained in phase4/mysql-default-compatibility.json and mysql-default-normalization.json. Review actual applied host checksums before migration; never blindly rewrite migration history/reset. Local fictional dump/restore is not a production backup.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

October 20, 2026. **Local-only executed steps. These are not authorization or instructions to migrate production.**

1. Created a consistent SQLite backup with the SQLite backup API from the isolated Phase 1 database. Kept `phase1-isolated-backup.db` outside source/release. Hash-recorded original dev DB, frozen Coming Soon ZIP, brand assets/component/CSS before work.
2. Prepared additive model/field extensions in both SQLite and MySQL schema tracks, preserving existing 32 models. Added eight models for capabilities, rate buckets, invitations/grants, destinations/versions and payment evidence/review. Retained legacy UI status fields and rows.
3. Prepared `20261019090000_phase2_foundation` and `20261019091000_byob_review` in each provider's migration track. Prisma's SQLite table rebuilds copy original columns/rows before replacing tables; no destructive business reset was used. MySQL uses provider-specific DDL and matching logical fields. Both schemas validate and normalized logical comparison matches.
4. Applied nine total migrations only to the copied preview and fresh regression SQLite databases. A second populated historical fixture includes booking/payment/ticket/check-in/attendance; migrating it preserved synthetic ticket token, financial amount/fee/status and attendance, with LEGACY_DEMO quarantine. Re-running migrate deploy reports no pending migrations.
5. Ran integrity_check and foreign_key_check and checked old IDs and ticket tokens. See `phase2/migration-verification.json` and `phase2/populated-legacy-migration.json`. New generated clients are code artifacts; the original dev.db has NOT been migrated. Do not run the updated ORM against the old original schema.

## Backfill rules

Existing records retain origin=LEGACY_DEMO; event/booking/ticket rows also retain testOnly=true. Payment origin follows the associated quarantined booking. Historical status mapping is for compatibility only: approved booking → CONFIRMED lifecycle, succeeded legacy payment → CONFIRMED workflow, rejection/cancellation mapped conservatively. It does **not** add actual funds verification, recipient snapshots, evidence or a real admission entitlement. REAL workflows refuse these records. No existing token is promoted to real.

Event.reservedCount initially reflects existing tier sold totals. Historical bookings get inventoryHeld=false because the link between historical sold counters and individual bookings is not trustworthy; automatic per-booking release would corrupt stock. Reconciliation is a separate controlled decision. New holds are tracked/released atomically. Retained legacy fixture dates/capacities are explicitly marked unconfirmed rather than silently converted into approved event facts.

## MySQL result and blocked work

Schema validation, logical parity, Prisma MySQL client generation and Node 22 optimized build pass. No local docker, mysqld or mariadbd is available. **MySQL migration application, rollback/restore, transaction isolation, deadlocks, last-seat contention, duplicate redemption/issuance/check-in and shared multi-process limiter behavior are NOT tested.** These remain blocked validation areas, not claimed compatibility certification. Do not point validation tools at Hostinger to overcome this limitation.

## Later migration gate

Before a separate authorized production release: provision disposable matching-version MySQL, restore a sanitized representative backup, inspect/rehearse provider DDL and FK/index limits, apply both migrations, compare counts/financial values/classification, run API/concurrency/failure tests and rehearse restore. MySQL DDL may auto-commit; do not promise transactional rollback. An approved consistent backup, downtime/online-DDL plan and tested restore are prerequisites. Prefer restore to hand-edited destructive down migrations. Record operator, backup, schema version, checksums and acceptance.

No production database was modified. The preserved Coming Soon release ZIP was not regenerated, so it remains a separate Phase 1 artifact and does not contain these backend changes.
