# Phase 11 update — October 27, 2026

Phase11 adds a10-second default delivery deadline, bounded below the60-second lease, AbortSignal and safe LOCAL_TRANSPORT_TIMEOUT retry/final failure. Stable notification ID is reused; abort-ignoring late side effects still require provider idempotency. No external adapter/recipient resolution/receipts/supervisor exists. Current worker command and provider-neutral proposed environment contract are in OPERATIONS_HANDOVER.md.

# Phase 8 hardening update — October 27, 2026

Current preview/CLI instructions: LOCAL_OPERATIONS_RUNBOOK.md. Reminder batches now walk past already-notified rows, count new notices accurately, and continue after a legitimate event409 race. Scoped abandoned final leases now create transactional failure audit and deduplicated in-app admin alerts.21 checks pass separately on disposable MySQL8.0.41 and MariaDB11.8.9;302 regression cases pass. Provider delivery remains unconnected. Historical Phase7 instructions below remain background.

# Notification delivery and operational jobs — local Phase 7

The existing Notification table remains the inbox and persistent outbox. Read/unread state and in-app availability are separate from delivery-job status. Transactional creation rolls back with its business change; dedupe keys protect ordinary retries. Customer/organizer/admin notices reuse protected routes and ownership checks.

The worker claims due PENDING/RETRY or expired PROCESSING jobs with a compare-and-set token and 60-second lease. It rechecks administrator access and recipient account/consent per claim. A stale worker cannot overwrite a new claim. Missing rows are safely skipped. Recoverable failure waits an exponential delay beginning at 60 seconds. Three automatic attempts terminate as FAILED; admins can authorize at most ten fresh retry cycles with audit. An abandoned final lease also fails visibly. Failure alerts are in-app-only operational records to prevent recursive failure loops.

`TransactionalTransport.send` receives an idempotency key and ticket/payment/registration/cancellation/rescheduling/refund/password-recovery/service template category. The implemented transport is a private local filesystem mailbox. Atomic link/create deduplicates by key even after interrupted processing; files are mode 0600 inside a mode 0700 directory. MOCK_DELIVERED means only this local adapter succeeded. External email/SMS/push is NOT_CONFIGURED. A future provider must support the same idempotency key; this is not an exactly-once guarantee for arbitrary external transports.

Promotional/social/reminder/announcement categories respect their individual consent. Essential booking/security updates are not suppressed by promotional preferences. Inactive accounts are skipped. No real messages were sent.

## Run locally

The preview is the isolated Phase7 workspace at `/Users/parsa/.codex/tmp/mixermates-phase7-20261027/preview`. The simplest run is Admin → Operations → **Run local operational jobs**. Failed deliveries show attempts, due/lease/last attempt, safe failure category and bounded retry controls. Successful runs appear as completed activity, distinct from failures.

For a command, change to that isolated preview, load its local `.env` without displaying it, and run `LOCAL_OPERATIONS_ACTOR_ID=<existing-fictional-admin-id> pnpm exec tsx scripts/run-operational-jobs.mts`. The script denies the canonical project, non-isolated data and non-SQLite URLs. Use an existing local admin ID, never a session token. Authentication/authorization is still enforced by the service.

Each run expires at most 100 eligible unpaid abandoned holds through the existing state service, preserving review holds/confirmed funds and releasing stock once; creates consented confirmed-event reminders within the next 24 hours, deduplicated by booking/terms version with an in-transaction state recheck; and processes at most 50 due notifications. Reminder batches are capped at 100. Repeated runs drain later batches. No registration, payment or refund is automatically approved. Issuance recovery is a separate explicit admin action and rechecks all eligibility.

Admin Operations also shows unreleased eligible holds, reviews older than the local 24-hour monitoring threshold, ticket recovery candidates and safe audit activity. This threshold is not an approved real business deadline. General database outage/process crash detection, unattended scheduling, provider delivery receipts, external alerts and production supervision remain incomplete. No cron or Hostinger task was installed. Before future authorized deployment, define operational ownership, schedule, lease/throughput policy, provider credentials, retention, restart/alerting and acceptance tests.
