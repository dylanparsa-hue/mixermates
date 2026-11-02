# Decisions required before real use

Phase 2 is local only. No production/provider access, collection, refund, subscription cancellation or external message occurred.

## Existing subscriptions and charges

The canonical **local** database has no OrganizerSubscription table. This is not evidence about production or external billing. The old schema, migrations, OrganizerSubscription/OrganizerPublication data and historical plan decoder are retained. Runtime renewal, activation, plan checkout and quotas are retired; no historical status, charge or cancellation instruction is rewritten.

A separately authorized transition must first back up and inventory production subscriptions, provider recurring agreements, renewal schedules, pending invoices/charges, past charges/refunds and account/organizer links. Reconcile provider IDs to stored records, identify unknown/unmatched records and obtain a reviewed plan for stopping renewals, grandfathered obligations, credits/refunds, notice/terms, reconciliation and rollback. Do not run cancellation/refund/provider operations based on an empty local inventory. This phase prepares the plan only; there is no automatic retirement migration of financial history.

## Direct QR commission collection

Customer money goes directly to the approved organizer recipient. A verified successful paid booking records 5% accrued commission once. It records **no platform collection**, payment split, payout or automatic settlement. Absorb and customer-paid bookings both create the organizer's commission obligation; customer-paid QR totals include the service fee in the amount sent to the organizer. Historical transactions without a new snapshot incur no new commission.

Before real use, approve commission terms/consent, invoice issuer/content/currency and applicable tax treatment, reconciliation periods, payment deadlines, invoice delivery, authorized collection method, collection evidence, corrections/disputes, overdue handling, credit notes and independent audit controls. Then separately authorize and implement a collection adapter with unique receipt/provider references, exact amounts/currency/recipient, idempotent ledger entries and protection against charging an already-collected fee. Collected revenue must come from verified platform receipts, never a customer-to-organizer payment or browser flag.

## Refund commission

No approved rule says whether the 5% is retained, fully returned or prorated after a full/partial refund, cancellation or chargeback. The system therefore records exact confirmed refund cash and a separate **refund fee policy review**, leaving gross accrued commission unchanged and explicitly showing it under review. No guessed commission reversal or collection occurs. Organizer net estimates are unavailable while refund obligations/fee decisions remain open. Gross sales and tickets sold remain historical totals; confirmed refunds appear separately.

Partial monetary refunds cancel the booking and revoke **all unused tickets**. This is explained in the Test refund form; it is not selective ticket cancellation. Remaining cash may be requested/refunded with a new idempotency key, subject to attendance, refund policy, independent authorization and the original confirmed-payment cap. Pending/failed requests reserve their amount until resolved, preventing duplicate refunds. Admission history is retained. A retained commission decision and any future adjustment require explicit approved terms and an audited process; no admin can silently erase the receivable here.

Approve fee treatment, customer-facing refund disclosure, rounding/allocation for partial ticket/partial order refunds, gateway fee retention/recovery and exception/dispute/chargeback handling before enabling real use. The current provider is fictional only; there is no live chargeback adapter.

## Future gateway

No live gateway is connected. A future separately authorized adapter must verify signatures/server-to-server events and provider transaction ID, status, amount, MYR currency, recipient and provider-account binding. Calculate the 5% from discounted ticket face value, not total collected, and derive gateway costs from verified configuration/transaction data (including provider rules that charge against total collected). Charge gateway costs only to the organizer. Use transactional idempotent success/refund/settlement entries, immutable fee snapshots, replay protection and explicit collection reconciliation. A redirect is never success and a verified gateway success should not require manual QR approval. Tax must follow approved applicable rules; no tax percentage is assumed in Phase 2.
