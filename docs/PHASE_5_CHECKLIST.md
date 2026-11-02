# Phase 5 acceptance checklist

October 26, 2026. Stable master IDs; no new inventory rows. Completed below means local fictional acceptance. Evidence: phase5/tests.log, browser-results.json, mysql-results.json, build logs and design review.

## Tickets — G-018, D-010/D-011/D-013, G-017/D-015

- [x] Premium existing official-brand ticket, real artwork and event-preset accents.
- [x] Holder, tier, event schedule, authorized venue, reference and status.
- [x] Large high-contrast private QR; native full-screen QR with focus/Escape handling, checked at all seven widths.
- [x] No active credentials for used, cancelled, refunded, invalid or revoked tickets.
- [x] Owner-authorized server SVG download and sanitized safe preview.
- [x] Multi-ticket ownership and distinct credentials; individual ticket controls.
- [x] Upcoming/past/cancelled My Tickets and owned booking details.

## Entrance — D-012/D-013/D-019/D-020/D-021, H-011/H-012/H-013/H-014

- [x] Event-scoped entrance section in existing organizer route and event selector.
- [x] Actual counts, last admission, tier breakdown, recent arrivals and owner staff activity.
- [x] Validate holder/event first, acknowledge applicable ID check, explicitly confirm admission.
- [x] html5-qrcode camera, permission feedback, device selection and capability-gated torch.
- [x] Camera cleanup, hidden-tab handling and repeated-frame/request guard.
- [x] Clear server success, invalid and duplicate refusals with readable original admission time.
- [x] Name/ticket/booking search, arrival filters and arbitrary configured tiers; 50-row presentation pages.
- [x] Manual fallback uses existing atomic service; method/staff/time recorded.
- [x] Private owner/admin CSV, server permission, minimal fields, audit and injection protection.
- [x] Explicit offline warning/retry and uncertain-commit reconciliation instructions.
- [ ] Physical phone camera, focus, lighting, Safari and field connectivity: NEEDS VERIFICATION. D-012/H-013 remain incomplete.
- [ ] Synchronized offline entry/queued admission: DEFERRED; not implemented or authorized.

## Staff — C-009, H-015

- [x] Existing-user/event assignment and revocation through existing Staff controls.
- [x] Guest view, check-in, finance, registration and private location remain separate.
- [x] Cross-event/self-escalation denied; revoked sessions and actions denied.
- [x] Scanner-only users receive no guest list; guest-only users cannot admit.

## Passport — D-021/D-022, M-013/M-014/M-015/M-019

- [x] Booking/proof/approval alone grants no attendance.
- [x] One accepted check-in creates private verified attendance and eligible badges.
- [x] Duplicate/multiple tickets do not duplicate the user/event Passport entry.
- [x] Explicit consent and private-event restrictions preserved by baseline regression.

## Security and quality — K-002/K-003/K-005, O-002/O-003/O-020/O-023/O-024

- [x] Owner/export scope, opaque credential, no raw audit tokens and server authority.
- [x] Existing transaction rechecks event/booking/ticket/staff and applicable ID acknowledgement.
- [x] Suspended/cancelled/ended/revoked/demo mismatches fail closed.
- [x] All 200 prior tests retained; final total 223 passed, zero failed/skipped/cancelled.
- [x] SQLite integrity/foreign-key/schema checks and MySQL 8.0.41 fresh migration/eight checks.
- [x] Seven widths in both themes across five surfaces; 70 measurements/captures.
- [x] Actual local Chrome customer/staff/organizer journeys; synthetic QR camera decoding.
- [x] TypeScript and optimized SQLite/MySQL-client local builds on Node 22.23.3.
- [x] Fresh finish review fix resolved; incumbent design system preserved.
- [x] Checklist, plan, decisions, results, operations and report updated.

## Local-only boundaries — O-022/O-023

- [x] No production deployment, Hostinger release, hosting/DNS/environment change or public tunnel.
- [x] No production database accessed or modified; fresh fictional disposable databases only.
- [x] Original root database and 15 protected brand files retain their initial hashes.
- [x] Real ticket sales remain disabled. Phase 6 not started.

## Inventory reconciliation

Phase 4 accepted JSON had 67 completed facets while its Markdown rows still had 57. The master rows now use that accepted JSON baseline. G-018 was already complete and receives stronger Phase 5 evidence. Seven newly completed local facets: C-009, D-019, D-020, H-011, H-012, H-014, H-015. Total: **309 = 74 complete + 159 incomplete + 33 blocked + 43 deferred**. Incomplete: 117 in progress, 28 not started, 14 needing verification. P0: 49 completed, 86 remaining, enumerated in phase5/remaining-p0.md. This is not real-event or release certification.
