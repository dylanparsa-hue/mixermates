# Phase 6 acceptance checklist

October 26, 2026 · local fictional acceptance. Stable 309-row inventory retained. Overall scope is partial where unchecked below.

## Organizer — C-004/C-013/C-018, F-006–F-010, H-009/H-010/H-016/H-018–H-020

- [x] Owned multi-event overview, exact booking/payment/ticket/arrival totals and search/status filter.
- [x] Existing edit/preview/submit, recipient history, tier controls, review and staff routes reused.
- [x] Payment/registration/BYOB/issuer checks remain independent; notes/history/evidence scoped on server.
- [x] Confirmed tier quantity differs from reserved stock. Historical organizer-direct amounts/outstanding expected money/workloads are stored values; no platform revenue or fee claim.
- [x] Cancellation UI shows impact and requires explicit confirmation; existing lifecycle closes booking/issuance/admission and marks confirmed funds for refund review.
- [ ] Controlled rescheduling with previous/new terms and affected-booking workflow. Existing locks retained.
- [ ] Real business cancellation/refund eligibility policies and production operations acceptance.

## Admin — C-005/C-006, J-007/J-019/J-020, K-003/K-020

- [x] Exact account/event/moderation/recipient/support workload counts.
- [x] Account search, role changes, suspension/reactivation with confirmation and session revocation; self lockout denied.
- [x] Existing independent fictional verification/QR review and event moderation queues preserved.
- [x] Booking/refund oversight; server-filtered audit viewer with safe actor/time/record/state/reason and pagination.
- [x] Admin operational links can open permitted event records; ordinary users/scanner roles denied.
- [ ] Actual organizer identity and banking verification; sales/commission/release decisions.

## Notifications — N-001–N-008/N-016

- [x] Existing transactional notices plus admin event/QR/verification queues and recipient-review outcomes.
- [x] Refund/support notices; customer/organizer/admin own inbox, unread count/read/unread and protected destination links.
- [x] Stable retry deduplication, new evidence versions, failed-transaction rollback.
- [x] Local mock failed delivery recorded, retry succeeds once; no external email.
- [x] Four preference controls persist; mandatory service updates independent.
- [ ] Production email provider/retry worker, scheduled reminders, announcements and external delivery acceptance.
- [ ] Controlled event-change notices and dedicated operational-failure escalation.

## Refund/support — F-010/H-018/J-019

- [x] Existing Refund records extended, one request per confirmed direct payment; legacy demo records preserved outside direct-request queue.
- [x] Separate request/review/decision/awaiting-transfer/evidence-report/customer-receipt states, optimistic version and full audit history.
- [x] No organizer/admin click alone records external funds as refunded; independent customer receipt required.
- [x] Approval atomically cancels booking, revokes active tickets and releases inventory once.
- [x] Private Report records reused with category/booking/event/status/reviewer/response; only reporter/admin can read case or its private report audit.
- [ ] Attachments, customer response threads, reopening, broad helpdesk integration and verified bank-transfer proof are outside this basic workflow.

## Quality, preservation and local boundaries — G-001/G-002, K-002/K-003/K-016/K-021, O-002/O-003/O-020/O-022–O-024

- [x] 246 tests pass, 0 failed/skipped/cancelled; all 223 baseline tests retained.
- [x] SQLite integrity/foreign-key checks, both provider validations, TypeScript and optimized local provider-client builds.
- [x] Disposable MySQL 8.0.41 seven migrations and nine targeted operations checks; three TEXT default-expression formatting differences documented.
- [x] 64 browser captures/measurements across 320/390/768/1440, light/dark, eight management/customer surfaces; zero overflow/broken images/page errors.
- [x] Organizer approval refresh, refund and support journeys, admin queues/accounts/bookings/audit, notification read state.
- [x] Actual theme controls used for final captures; notification pagination and separately reachable customer preferences. Fresh reviewer scored its two fixes resolved, disposition ship for those fixes.
- [x] Existing digital tickets/scanner/duplicate protection/Passport regression retained; Coming Soon and brand/original database preserved.
- [ ] Physical phone camera, focus/lighting, Safari, field connectivity, actual banking and production email remain unverified.
- [x] No deployment, production DB change, Hostinger/DNS/environment/hosting change, public tunnel, real sales activation or Phase 7 work.

Inventory: **309 = 80 completed + 153 incomplete + 33 blocked + 43 deferred; 80 remaining P0.** Six local facets newly complete: C-018, H-016, F-010, H-018, J-019, K-020. Broader incomplete facets retain their limitations.
