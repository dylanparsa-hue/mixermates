# Organizer Phase 2 — local handoff

2 November 2026. Implemented in the existing MixerMates source, continuing the completed organizer creator and guarded local payment simulator. **Local only: no deployment, production/provider access, real collection, external messages or release archive.** Owner visual acceptance remains separate. Work stops at Phase 2.

## Subscription retirement and organizer access

Removed the homepage subscription cards, subscription/upgrade forms, Studio plan/renewal/quota panel, legacy plan-query checkout and subscription simulation actions. Removed every server publication-quota call, including the legacy event endpoint. There is no subscription purchase, renewal or monthly publication limit in an active path. Old activation/cancellation/lookup HTTP routes return 410; compatibility domain exports cannot activate or renew a plan.

Create Event uses the existing authenticated account service: active eligible adults retain their user ID, credentials/Google identity, role, profile, friends, tickets and booking history. The backend activates the ORGANIZER capability and the single stable organizer identity. No separate email, second account, subscription form or organizer payment is required. Existing organizer accounts continue to work. Event moderation, verified recipient/organizer requirements for manual QR, invitation scope and disabled real-sales controls remain intact. Guarded fictional simulator publication retains its existing explicit local-only exception.

Historical OrganizerSubscription and OrganizerPublication tables, migrations and the isolated accounting decoder remain; no records, charges, refunds or status dates are silently deleted or rewritten. Access checks never consult them. A read-only inventory found that the canonical **local** DB predates the subscription table. This does **not** establish whether production/provider subscriptions or charges exist. Their inventory and transition require a separately authorized plan; see [business decisions](organizer-phase2/BUSINESS_DECISIONS.md).

## Pricing and fee snapshots

A fixed **500 basis points (5%)** applies to the actual paid face value after stored ticket discounts. Money uses bounded integer MYR sen. Fee multiplication and half-up rounding use BigInt; rounding occurs once per discounted order. Free tickets have zero fee. Environment/browser fee rates cannot override this calculation. No tax rate or gateway percentage is assumed.

| One RM100 paid ticket | Organizer absorbs | Customer pays fee |
| --- | ---: | ---: |
| Discounted ticket face value | RM100.00 | RM100.00 |
| MixerMates platform fee | RM5.00 | RM5.00 |
| Customer total | RM100.00 | RM105.00 |
| Organizer amount before gateway charges | RM95.00 | RM100.00 |

Tickets has the native **Who pays the 5% MixerMates fee?** radio group and immediate per-tier preview: ticket price, MixerMates fee, customer total, organizer amount before gateway charges and an explicitly unknown gateway fee. More ticket options supports a server-stored per-ticket discount. Fee policy remains visible in the editor and event overview/ticket inventory.

Checkout shows the actual breakdown, fetches a server quote before confirmation and sends only selection plus a comparison key. The reservation transaction independently recalculates all amounts from stored prices, discounts and fee policy; stale reviewed pricing is rejected. It never trusts a client fee, discount, rate, total or gateway amount. New BookingFeeSnapshot rows retain policy/rate/version, discounted face value, discount, platform fee, customer total, organizer amount and unresolved refund-fee policy. Saved booking screens use that snapshot. Event financial settings/ticket definitions lock after a booking; administrative future-version changes cannot mutate an existing snapshot. Old bookings get no snapshot backfill or retrospective fee.

## Gateway and direct QR accounting

Gateway charges are always organizer-borne and never offered as customer pass-through. New nullable recorded gateway-cost/source fields distinguish unknown from a known zero/verified cost; no gateway-cost write API or live provider is connected. Organizer estimates exclude unknown fees and say so.

Manual QR still uses the approved versioned organizer instructions, private evidence, independent exact-amount funds confirmation, separate registration approval where required, and exact ticket issuance. A receipt submission or rejection creates no commission or tickets. A verified paid confirmation appends one idempotent CommissionEntry accrual in the same transaction. Ticket recovery does not charge again.

For direct QR, even a customer-paid service fee reaches the **organizer**, not MixerMates. Accrued/outstanding commission is a receivable. Collected commission is zero because there is no collection adapter or verified platform receipt. The application claims no automatic withholding, split payment, bank settlement or platform revenue from organizer receipts. The fictional provider also accrues once from a persisted trusted success; redirects/browser status never authorize payment.

## Organizer and admin Payments

The primary Payments screen shows paid tickets sold before refunds, ticket face value after discounts, absorbed/passed platform fees, commission accrued, collected and outstanding. A named disclosure holds known gateway expenses, organizer amount/estimate, confirmed refunds, refunds awaiting review/settlement, commission requiring refund terms and pending manual confirmations. Empty real scopes are compact. TEST and real financial records are separate and never combined; event financial summaries retain that distinction.

**Review QR Payments** selects the pending manual queue before pagination. The all-payment/registration view remains available. Booking reference, customer/event, expected amount, private evidence, review decisions and authorized audit history use the existing permissioned workflow. Finance-only visibility/actions remain separate from registration and scanner access. Foreign organizers cannot read or review another event's finances.

## Refunds and other edge cases

Full and partial confirmed refund cash is recorded exactly, capped against the original payment including concurrent/requested amounts, with stable request/provider idempotency. Pending/failed attempts do not claim settled money. Partial refunds cancel the booking and revoke **all unused tickets**, with explicit form copy; this is not selective ticket cancellation. Remaining cash can be requested using a fresh request key. Checked-in attendance continues to block routine refunds and remains stored.

No approved business rule specifies retention/reversal/proration of platform fees. Confirmed refunds therefore append a separate refund-fee review marker, preserving gross accrual and showing it under review. No guessed fee adjustment or collection occurs. Organizer net estimates are withheld while refund obligations or commission decisions remain unresolved. Event cancellation preserves paid history and requires separate refund settlement. Rejections, duplicate provider events, changed prices/policies and old bookings are covered. A live chargeback adapter is inapplicable: no live gateway is connected. Approved fee-refund terms and an audited adjustment process remain prerequisites for real use.

## Verification

| Check | Final result |
| --- | --- |
| Existing automated regression suite | **381 passed, 0 failed; 3 environment-specific groups skipped** in the general fixture |
| Focused retirement/commission/simulator groups in verified Lab | **40 passed, 0 failed, 0 skipped**, exercising the skipped simulator/commission groups |
| Separate Coming Soon/auth/session/cache access group | **10 passed, 0 failed, 0 skipped**, exercising the remaining skipped group |
| Existing Playwright desktop/mobile suite | **10 passed** |
| New Phase 2 browser journey | **8 checks passed**, 18 matrix captures, no page errors/overflow |
| Normal booking partial/remaining-refund browser journey | **3 checks passed**, exact RM50 + RM160 refunds and two unused tickets revoked |
| Local production-mode refusal checks | **14 adapter requests refused**; finance authorization/real-sales guards pass; zero booking/snapshot/commission/simulator writes |
| TypeScript | Passed |
| SQLite and MySQL Prisma schemas | Valid |
| Optimized Next.js production build | Passed in an isolated local build directory |
| Additive SQLite upgrade rehearsal | **49 existing tables / 2,365 rows retained**, all old-column row fingerprints match, integrity/foreign keys pass, no historical fee snapshots created |
| Canonical DB / original assets | **All 65 protected hashes match**; see source-preservation.json |
| Mechanical UI detector | `[]` |

Financial coverage includes free same-account activation; 28 paid/free publications beyond the old largest quota with an expired subscription untouched; both RM100 policies; multiple tickets; persisted discounts; free RSVP; manual QR/evidence; independent funds confirmation and registration; exact ticket issuance; full/partial refunds and remaining-balance caps; fee/price change snapshots; hostile client amounts; old/new accounts; accrued versus collected; cross-organizer/payment-review denial; pending-queue filtering across more than 50 unrelated rows; duplicate callbacks; event cancellation; gateway known/unknown differences; historical transactions without retroactive commission.

The first regression attempts exposed missing harness flags/server setup, and the copied older browser fixture's events had elapsed dates. Final verification used a new isolated regression fixture with the required customer flag/recovery marker, separate access credentials, sequential access/browser checks, and one added upcoming fictional discovery event. No production data was used. The browser renderer was also settled at the top before full-page capture. Assertions were retained; failed product tasks were not relabeled as passes.

Evidence: [financial tests](organizer-phase2/financial-tests.log), [regressions](organizer-phase2/regression-tests.log), [access](organizer-phase2/access-tests.log), [existing E2E](organizer-phase2/existing-e2e.log), [new browser results](organizer-phase2/browser-results.json), [refund browser](organizer-phase2/refund-browser-results.json), [local production-mode refusals](organizer-phase2/production-refusal-results.json), [build](organizer-phase2/optimized-build.log), [migration](organizer-phase2/migration-results.json), [source/asset preservation](organizer-phase2/source-preservation.json), [design review](organizer-phase2/design-review.md). No physical phone or screen-reader session was performed. MySQL schema validation passed; these two new migrations were not executed against MySQL/MariaDB in this phase.

## Local preview

Open **http://localhost:3083/**. This is the isolated fictional Test Lab, bound only to loopback. A fresh browser automatically enters as the fictional customer; no password or access code. Create Event → Tickets shows the fee policy. Publish a TEST event, then purchase through the normal checkout. Workspace → Organizer → Payments shows the same identity's financial summary. Workspace → Admin → Payments & sales shows the admin financial view. Review tools preserves independent fictional reviewer identities. Real funds, subscriptions, sales and admission remain disabled.

Restart if needed:

```sh
python3 /Users/parsa/.codex/tmp/mixermates-correction-20261102-phase2/preview/.local/start-test-lab.py
```

Do not migrate or seed the canonical source database to preview. The previous localhost:3082 simulator workspace and all original assets/data remain untouched. Source backup: `/Users/parsa/.codex/tmp/mixermates-phase2-20261102/source-before.tar.gz`.

## Remaining production/business decisions

Approve the real subscription/provider inventory and transition; commission consent/terms and invoicing/collection method; refund-fee retention/proration, credit notes/disputes and gateway-fee handling; applicable tax treatment; any real gateway provider/configuration; production migration rehearsal/backup and fresh release authorization. [BUSINESS_DECISIONS.md](organizer-phase2/BUSINESS_DECISIONS.md) gives the required sequence. None is activated or inferred from this local implementation. No future phase is implemented.
