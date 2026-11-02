# Operations handover

October 27, 2026 · local-only Phase 11. Actual incident, finance, registration, entrance, support, worker/alert and backup owners are **UNASSIGNED**. Production access, provider configuration, real transfers/messages, deployment and sales are prohibited in this phase.

## Existing operational engines

Notification is the existing inbox/outbox. Business transitions, audit and essential in-app notices commit together. Read state is separate from job state. Optional promotions/social/reminders/announcements require the applicable preference; essential notices remain available. Claims recheck active account and administrator permissions. Claims use a 60-second lease and unique worker token; stale workers cannot overwrite a later claim. Local send has a 10-second default deadline (internal maximum 30 seconds, below the lease), abort signal and sanitized timeout state. An adapter that ignores cancellation may still perform a late side effect: the same durable idempotency key must be honored by any future provider. This is not an external exactly-once guarantee.

Retries begin after 60 seconds and double, with three automatic attempts. Final failed/abandoned claims produce a deduplicated in-app-only admin alert. Manual retry is authorized/audited and limited to ten cycles. `MOCK_DELIVERED` means a private local mailbox only. Failed transport details and private content are not copied into error/audit messages.

**Run local operational jobs** processes at most 100 eligible unpaid expiry candidates, 100 new consented reminders and 50 normal notification claims, plus bounded abandoned-final-lease cleanup. It preserves submitted-proof holds/confirmed funds and releases stock once. Reminder discovery walks past already-notified bookings. Issuance recovery is a separate explicit eligible action. No job automatically approves money/registration, sends a real refund or enables sales. There is no supervised production scheduler.

Preview: `/Users/parsa/.codex/tmp/mixermates-phase11-20261027/preview`, `http://localhost:3061/organizer/login`. Safe restart and tests: [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md). Local CLI from that preview after the runner loads its own environment:

```sh
LOCAL_OPERATIONS_ACTOR_ID=phase1_preview_admin python3 ../run.py preview pnpm exec tsx scripts/run-operational-jobs.mts
```

The CLI resolves its database inside the owned workspace, refuses DB_* overrides/canonical/sibling paths and production mode, and rechecks the fictional administrator. Do not substitute a real account or host. Use Admin → Operations for visibility and bounded retries. Review-held stock still needs a human decision; a worker does not silently release it.

## Incident procedures

For every incident: record Asia/Kuala_Lumpur time plus UTC, impact, actor role, nonsecret operation/booking/event reference, observed HTTP/status, last known success, safe action, result and escalation owner. Preserve DB/history/private evidence in place. Never record session/reset/invitation secrets, raw ticket credentials or receipt bytes in logs. A response timeout may follow a committed transaction; reread before retrying.

| Symptom / recognition | Safe immediate action / preserve history | Prohibited action / escalate |
| --- | --- | --- |
| Login fails or session revoked | Check local server/DB and authorized account active/security state; distinguish invalid credentials, expiry and 503. Preserve audit/time. | Do not bypass auth, grant a role directly or reveal whether a recovery email exists. Escalate to admin/incident owner. |
| Booking fails | Stop repeat submissions; read saved reference, event/tier capacity and current status. Correct validation or restore service before retrying the same operation. | Do not force stock negative, duplicate a booking or reset tables. Escalate reproducible infrastructure/capacity uncertainty. |
| Funds confirmed but no ticket | Preserve payment, independent review, original recipient and registration/BYOB state. Resolve cause; use Retry eligible issuance and verify exactly one credential. | Never request another payment, fabricate a ticket or revive revoked/cancelled state. Escalate to finance/admin. |
| Organizer cannot confirm funds | Check fresh event/finance permissions, original amount/version, current review hold/event change and saved review outcome. Preserve evidence/history. | Do not attest unverified money or substitute recipient/amount. Scanner/customer cannot confirm funds. Escalate to independent finance reviewer. |
| Scanner cannot reach server | Stop admission; preserve nonsecret reference/time, reconnect and reread server history before retrying. Manual fallback also requires server approval and ID acknowledgement. | No offline acceptance, second-device override or duplicate stamp. Escalate to entrance manager. |
| Notifications stall/fail | Inspect due/lease/attempt state in Operations. Local timeout becomes retry; wait until due or request authorized bounded retry after fixing cause. Check later rows continue. | No counter edits/deletion, unlimited retry loop or claim of actual email. Escalate worker/provider owner. |
| Database unavailable/incompatible | Stop finance/admission mutations. Check only the owned local URL/process/schema; preserve failed DB/logs. Restore known-good backup to a fresh path if needed. APIs return safe 503. | No reset, bootstrap/seed repair, production connection or in-app-only monitoring assumption. Independent monitoring required later. |
| Unexpected cancellation | Stop entry/sales, verify audited actor/state and affected bookings; preserve committed check-ins/payment history; open support/refund review. | Do not republish/revive cancelled event or erase obligations. Escalate event/incident/finance owners. |
| Suspicious recipient QR | Stop directing new payments; authorized admin can disable the destination using its existing audited action. Compare saved original version privately and investigate reports. | Do not overwrite old instructions, accuse from a risk flag, collect bank credentials or perform transfers. Escalate finance/incident owner. |
| Possible private-data exposure | Stop affected sharing/export and contain through supported access revocation/suspension. Preserve private evidence, access/audit times and scope. Qualified owner reviews next response. | No public repost, destruction of evidence, unsupported legal assurances or external notification from this phase. Escalate incident/privacy owner. |

Repeated invalid check-ins are logged as rejection activity. Review event/staff/time patterns privately; preserve audit and use existing revocation/suspension when justified. Support escalation must have a named real contact before operation; none is fabricated here.

## Backup, restore and rollback

No Phase 11 schema/migration change. Retain Phase 10 populated upgrade/failed-migration evidence. Rerun current SQLite backup/fingerprint/fresh restore and SQL dump/import/fingerprint/FK checks after the implementation. Use [DISASTER_RECOVERY_RUNBOOK.md](DISASTER_RECOVERY_RUNBOOK.md) and [BACKUP_RESTORE_TESTS.md](BACKUP_RESTORE_TESTS.md). Never restore over an existing database or reset the canonical database.

Owner approval is still needed for backup frequency, encrypted/authenticated off-host destination, least-privilege access, key custody/rotation, retention, legal hold, restore owner and RPO/RTO. No objective or schedule is approved. Proposed operating procedure: take a consistent backup before authorized changes and on an owner-approved periodic schedule; validate schema/migration/version plus all financial/recipient/ticket/check-in/attendance/refund/notice/audit fingerprints in a fresh environment. Record measured recovery against the later approved targets. File hashes alone do not provide adversarial authenticity. Failed DDL may partially persist; an older binary may be incompatible with a newer schema. Do not mark failed migrations applied or presume automatic DDL rollback.

## External email and worker preparation — no connection

Reuse the existing outbox and `TransactionalTransport`; do not add another notification service. The current abstraction has no real destination resolution, provider receipt/callback storage or live adapter. Password recovery has a separate existing private recovery transport with secret-token handling; it also has no external delivery. Future approved work must define their shared provider integration without routing reset secrets into ordinary audit/inbox logs.

Proposed configuration names **are a contract for future work, not currently supported activation switches**: `TRANSACTIONAL_EMAIL_PROVIDER`, `TRANSACTIONAL_EMAIL_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`, `TRANSACTIONAL_EMAIL_REPLY_TO`, `TRANSACTIONAL_EMAIL_WEBHOOK_SECRET`, `TRANSACTIONAL_EMAIL_TIMEOUT_MS`. Existing `APP_ORIGIN` must name an approved trusted HTTPS origin in a future release. Keep secrets in an approved secret store, never client bundles or source. Verify provider account, sender/domain/SPF/DKIM and chosen DMARC policy in separately authorized work. Use a provider sandbox and an explicitly approved test address; no real customer delivery now.

A future adapter must resolve the current authorized recipient internally, minimize template content, use protected account-bound links, honor the stable notification ID as durable idempotency key, abort within the configured deadline, classify timeout as uncertain delivery, and retain provider identifiers safely. Design signed/replay-safe callbacks with durable receipt states before claiming delivered/bounced status. Recheck optional consent/account state at delivery; essential service updates remain distinguishable from marketing. Honor provider opt-outs for optional messages. Test 429/5xx, hanging requests, late success, crash-after-send, duplicate/reordered callbacks and privacy before enabling any adapter.

A future supervisor must prevent overlapping normal job runs or coordinate claims, restart crashed workers, monitor last-success/oldest-due/failure age and queue growth, and alert a named owner independently of the application DB. Lease reclamation alone is not process supervision. Define alert severity, dedupe and escalation response times; no real destination, cron, credentials or automation is configured here.

## Retention preparation — no deletion job

No duration is approved and no automatic retention/deletion is implemented. All rows below are proposals for review under DEC-14/23/24/29/30/31/36. Choose durations only after business/qualified privacy/legal review; preserve disputes/holds and referential dependencies first.

| Data | Proposed retention basis pending approval | Dependencies / access / disposition review |
| --- | --- | --- |
| Accounts and sessions | Account lifecycle; security session expiry remains seven days | Revoke access through supported service; retain required booking/financial/audit relationships; do not cascade-delete history. |
| Invitations/grants | Invite expiry/revocation plus approved investigation window | Hashed secret only; keep grant/booking references; never publish tokens. |
| Registration answers | Event operation plus approved support/dispute period | Private IC-name/age/Instagram are not public profile consent; minimize collections, no ID image by default. |
| Payment evidence | Review, dispute and financial-record needs | Private blobs link booking/payment/reviews/snapshots; restricted finance/customer access; hold before removal. |
| Refund/payment history | Required financial/accountability period to be approved | Preserve original amounts/recipient/version/reviewer and transfer-vs-acknowledgement distinctions. |
| Support records | Approved support/dispute/incident period | Private reporter/admin access; avoid unnecessary personal/bank data; protect investigation evidence. |
| Check-ins | Approved entrance/security/support period | Preserve once-only ticket/attendance audit; no deletion to permit re-entry. |
| Attendance/Passport | Explicit account/privacy/consent policy | Private by default; consent revocation affects discovery. Retention/deletion needs deliberate history/dependency handling. |
| Security/audit logs | Approved investigation and accountability period | Redact secrets; restrict access; current storage is not immutable external audit. |
| Backups | Approved restore window and legal/incident holds | Encrypted/authenticated restricted storage, keys and expiration proof; restore must not silently resurrect withdrawn public consent. |

## Handover gates

Local tested software is separate from real identity/recipient/event decisions, external provider/hosting acceptance, physical-device/door testing and explicit authorization. All remain visible in [OWNER_ACTION_REQUIRED.md](OWNER_ACTION_REQUIRED.md) and [LAUNCH_READINESS_CHECKLIST.md](LAUNCH_READINESS_CHECKLIST.md). Do not deploy, connect a provider, send messages, activate real events or sales from this document.
