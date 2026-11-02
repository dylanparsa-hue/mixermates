# Booking, payment and admission states

## Current Phase 4 status — October 20, 2026

Reservation expiry applies only to due unpaid stock-held reservations without reviewHold. On-time proof sets reviewHold and preserves stock beyond the initial deadline; rejection/correction does not silently release it. Operator must review/cancel explicitly. Confirmed funds remain durable if ticket creation fails; existing issuer retry cannot request a second payment. Registration/BYOB approvals remain separate. Terminal/revoked/duplicate controls are unchanged. Production expiry cron is prepared but disabled.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

Phase 2, October 20, 2026. Canonical fields coexist with legacy UI `status` / `paymentStatus`; the domain service owns synchronized transitions. Historical approved/succeeded demo records are not real financial evidence.

| Entity | Canonical progression | Terminal / exception behavior |
| --- | --- | --- |
| Booking.lifecycle | DRAFT → RESERVED → PENDING → CONFIRMED | RESERVED/PENDING → EXPIRED or CANCELLED; CONFIRMED → CANCELLED; terminal rows cannot return to confirmed |
| Booking.registrationState | PENDING → APPROVED or REJECTED; free non-review path NOT_REQUIRED | Rejection cancels the booking and releases its hold; no self approval |
| Booking.paymentState / Payment.workflowState | AWAITING_PAYMENT → PROOF_SUBMITTED → UNDER_REVIEW → CONFIRMED or REJECTED | Rejected evidence can be replaced; cancellation after confirmed funds becomes REFUND_PENDING, never automatically REFUNDED |
| Booking.byobState | NOT_REQUIRED or PENDING → APPROVED / REJECTED | Separate from payment. An approved bottle image does not confirm money |
| Ticket.status | No ticket → ACTIVE → CHECKED_IN | CANCELLED/REVOKED deny entry; checked-in history retained; explicit exception process needed for reversal |
| Event.status | DRAFT → PENDING_REVIEW → PUBLISHED → SUSPENDED / CANCELLED / COMPLETED | Only admin changes lifecycle. Suspended can restore or cancel. Completed/cancelled terminal. Halloween publication remains blocked |

A suspended event denies both QR and manual entry inside the transaction. Ending time and nonpublished state also deny entry. Sales pause stops new reservations/reviews/issuance, while existing eligible admission may continue; it is distinct from event suspension. Rescheduling uses existing organizer edit logic with an event version change; a full customer notification/reschedule-policy flow remains later work.

## Single eligibility decision

`eligibility()` requires the correct active event, unexpired reservation where relevant, active age-eligible account, correct origin/test classification, required registration/BYOB approvals and required payment confirmation. A paid REAL-model booking additionally needs exact amount, confirmed payment workflow/time, an independent funds-verified review, immutable approved recipient snapshot/version and matching accepted evidence where required. Admission additionally requires CONFIRMED booking and ACTIVE, nonrevoked matching-origin ticket. A receipt alone does not qualify.

`issueEligibleTickets()` is the common issuer for reviews and explicit domain issuance. It rechecks event state in its transaction and creates only missing unique booking/sequence tickets. Repeated issuance cannot create extra tickets, audits or ready notifications. Revoked tickets are not silently regenerated. Random 32-byte tokens are not meaningful registration/payment flags.

## Inventory

New reservations atomically claim event.reservedCount and tier.sold under finite capacities. Each booking holds its quantity until cancellation/expiry releases it with an inventoryHeld compare-and-set. Repeated expiry/cancel is safe. Confirmed entry continues to consume capacity; admission does not release stock. A checked-in registration cannot self-cancel. Expired bookings cannot issue tickets even before an operator runs the expiry service. Operators must later schedule that service for timely stock recovery; no background production job is enabled now.

Historical rows have no trustworthy per-booking stock reconciliation and therefore inventoryHeld=false. Their existing counters and records are preserved. Legacy cancellation cannot decrement unknown stock twice; an explicit reconciliation is required before treating historical inventory as real capacity.

## Atomic effects

Sensitive transitions, audits and required in-app notifications commit together. Event cancellation closes sales, cancels current bookings, revokes unused tickets, releases known holds and records REFUND_PENDING for confirmed direct payments. It preserves financial records and prior check-in/attendance. No external refund is performed. Invitation revocation removes the authorization grant without cancelling existing paid/approved bookings.
