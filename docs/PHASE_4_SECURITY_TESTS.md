# Phase 4 security acceptance

Local fictional acceptance only; no external penetration test or actual Hostinger certification.

| Boundary | Verified behavior |
| --- | --- |
| Authentication | Anonymous denial; persisted account/session/security version; login continuity; private invite cannot be claimed by new signup. |
| Scope | Foreign booking/event/receipt/attachment/ticket/export denied; customer/scanner cannot review money or enter admin. |
| Sales gates | Disabled/invalid modes fail closed; invite_only and approved_events tested with actual MySQL HTTP; production candidate refuses isolated test adapter. |
| Registration | Required/age/choice/conditional/hidden/file validation; server price/stock/quantity/sale windows. |
| Evidence | Genuine bounded images, no spoofed MIME, private owner association, rate/origin checks, preserved corrections. |
| Finance | Expected amount, immutable recipient, independent check, meaningful notes, separate registration/BYOB, idempotent review. |
| Durability | Funds commit survives forced issuer failure; retry issues once without repayment. |
| Contention | Last seat, invitation one-use, duplicate issue, QR/manual admission and expiry release tested on SQLite and MySQL. |
| Data privacy | No-store/private responses; exact venue only after eligibility; sanitized share export; admission token stays private. |
| Operations | Six-process DB rate limit, reconnect persistence, backup/restore including blob hashes. No startup migration/seed. |

Evidence: `phase4/tests.log` (199/199), `mysql-runtime-results.json` (10 checks), two `mysql-http-*.json` files (10 checks), `release-smoke.json` (25 checks), `mysql-recovery.json`. No credentials or raw real receipts are included in those reports.

Open: host engine/checksum/backup safety, actual Linux/native engine/proxy/TLS/body limits, real banking/identity policies, physical camera/device/offline rehearsal, actual admin/staff provisioning and monitoring. No production deployment was performed.
