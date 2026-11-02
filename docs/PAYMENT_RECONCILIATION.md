# Manual payment reconciliation

October 27, 2026 · Asia/Kuala_Lumpur · localhost only

Open Organizer/Admin → Booking reviews → select permitted event → Open payment reconciliation. The separate booking-review queue is paginated at 50, and individual Risk indicators & review history opens private review signals. This is organizer-direct money; MixerMates has no custody, platform earnings, bank API, automatic verification, fee deduction or commission calculation here.

Definitions use REAL-origin organizer-direct payment bookings only (including explicitly fictional testOnly rehearsals):

- Expected across booking history: original required booking totals, including historical cancelled records. It is not current revenue or cash owed.
- Evidence awaiting review / under review / rejected claims: current booking payment state totals. They are not cumulative transfer counts.
- Independently confirmed organizer funds: gross original Payment.amount with confirmedAt and a funds-verified confirmation review. It stays recorded through cancellation/refund; refunds are separate, never silently subtracted as independently settled cash.
- Outstanding claims: only active RESERVED/PENDING bookings in unconfirmed payment states. Expired/cancelled history is excluded.
- Pending refund obligations: bookings whose payment state is REFUND_PENDING, including cancellations before a separate refund request exists.
- Refund records and reported refunds: actual existing Refund statuses/amounts; TRANSFER_REPORTED is separate from customer REFUND_CONFIRMED acknowledgement. Neither proves bank settlement.
- Open payment concerns / disputes: distinct bookings linked to unresolved PAYMENT support records (or an explicitly recorded disputed state). A concern is not proof of a fraudulent or successful transfer. The existing private support system remains responsible for responses.

Filters cover pending evidence, under review, rejected claims, confirmed funds awaiting registration approval, confirmed funds with missing tickets, refund action, cancelled unresolved funds, recorded risk indicators and open payment concerns. Totals cover the whole event, independently of the 50-row displayed page. Rows preserve original recipient version/name, ticket tier, required amount, reviewer/confirmation time, registration/booking state and refunds. Refresh after a manual review.

Financial CSV repeats the same permitted filter in 200-row keyset chunks. Minimum fields: booking reference, tier, required sen, payment/registration/booking states, recipient version, confirmation time and refund state. It excludes names/contact details, support narratives, receipts and QR credentials. Formula-leading whitespace/control/=+-@ cells are prefixed safely and CSV quoting escapes embedded quotes/newlines. Finance permission is required initially and per streamed batch; requests are audited. Exports are private/no-store. The snapshot is not transactionally frozen across an entire long stream; changes during export require a fresh comparison before accounting decisions.

Actual bank records, authorized live reviewers, transfer allocation for legitimate shared purchases, refund execution and financial/legal operating policy remain human/external acceptance. No net revenue, auto-settlement or uniquely verified transfer reference is claimed.
