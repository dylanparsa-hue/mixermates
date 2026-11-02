# MixerMates organizer subscriptions — local handoff

28 October 2026. Local implementation and fictional isolated QA only. No production or billing activation. Owner visual acceptance remains separate.

## Delivered

The default customer homepage now ends with a **Become an Organizer** section: Starter **RM9.99/month, 2 events**; Pro **RM49.99/month, 7 events**; Business **RM99.99/month, 25 events**. Pro has the owner-requested Most Popular badge. The three desktop cards stack on mobile and use existing cinematic typography, semantic Light/Dark colors, generous padding, rounded corners and a bounded reveal with reduced-motion support.

Get Started carries the chosen plan to an authenticated activation screen. The existing user receives an ORGANIZER capability; email, ID, customer role, profile, tickets, bookings and social features stay with that account. No second account is created for the upgrade. Ordinary fictional signup accounts and the original Lab customer are supported. Entering an independent local reviewer workspace remembers the customer through an opaque, revocable session; returning restores that same customer rather than changing them to the predefined owner persona. Administrative authority is never granted by a plan.

Organizer Studio displays the current plan, actual publication usage, monthly price, renewal/end date in Malaysia time, pending plan changes and cancellation/resume actions. Cancellation uses an inline confirmation. Inactive plans can still access existing operating/customer records.

## Subscription policy implemented and tested

- **Monthly periods:** activation anniversaries in Asia/Kuala_Lumpur time, with half-open periods `[start, end)`. A short month clamps to its last day while retaining the original anniversary day for later months. Leap years and the exact boundary are tested.
- **Usage:** an event's first successful publication creates one immutable, event-unique ledger entry in the same serializable transaction as approval. Drafts, pending/rejected reviews, failed transactions and failed publication checks do not spend a slot. Repeat approvals, edits and suspension/restoration of the same event do not double count. Cancelling an event does not return a spent slot.
- **Limits:** limits come from the server catalogue. A subscription version fence and transactional ledger count prevent concurrent approvals from exceeding the final slot. The central lifecycle publication route and legacy event-create/edit publication paths enforce the same policy. Quota enforcement does not replace independent review, verification, payment or sales gates.
- **Renewal:** active TEST plans renew fictionally, reconciled on subscription reads or publication attempts. Usage starts at zero in the new period and unused slots do not carry over. No charge, scheduler or external provider is involved.
- **Plan changes:** queued for the next anniversary. Changing or reselecting a plan never resets the current period or grants extra slots. Reselecting the current plan can clear a pending cancellation/change.
- **Cancellation:** access continues until period end, then new publication is denied. Already published events, their bookings/tickets and the customer's other features stay available. Managing an already-counted event does not consume a new slot. Cancellation does not trigger payments or refunds.
- **Reactivation:** before expiry, resume the same period and usage. After expiry, a new fictional activation starts a new anniversary period. Historical publication entries remain.
- **Existing authority:** pre-existing manually granted ORGANIZER/ADMIN roles without a subscription retain their existing publishing authority. Capability-only customer upgrades need an active plan for new publication. An identity that selects a plan is subject to that plan's quota. The legacy capability-request endpoint cannot activate a subscription.

## Local-only activation and data boundary

Activation/cancellation run only inside the existing guarded Test Lab: development runtime, loopback origin, owned disposable SQLite path, validated sentinel and all-fictional database, authenticated controller and authenticated adult fictional customer/organizer. The server derives the user from its session; client user IDs, price/limit/verification flags, foreign origins and anonymous activation fail closed. Role, verification and administrative authority are not changed.

Real subscriptions remain inactive. There is no billing provider, checkout, card collection, webhook, real renewal, charge or provider-success redirect. TEST subscriptions cannot authorize publication in production or outside the strict Lab environment. A future real provider and verified activation process require separate authorization and implementation.

Two additive models/migrations, OrganizerSubscription and OrganizerPublication, are included in SQLite and MySQL schemas. SQLite migration was rehearsed only in disposable local fixtures. Both schemas validate. MySQL migration SQL was prepared and validated offline; it was not applied to a hosted database or claimed as executed provider parity. The canonical `prisma/dev.db` was not migrated or changed; its checksum is recorded in organizer-subscriptions/preservation.json. Original media assets and Coming Soon protections are unchanged.

## Verification and review

See [the evidence index](organizer-subscriptions/README.md) for executed results and captures. Customer signup, same-account activation, independent approval, discovery eligibility, Studio usage, cancellation/resume and customer routes were exercised for every plan. The local subscription suite covers quota contention, rollback, invalid publication, repeated publication, renewal/cancellation and production simulation denial. General regression tests cover existing booking, payment, ticket, admission, privacy, event review and security paths.

No deployment/upload, production access, canonical DB migration, real billing/payment/sales, tunnel, hosting/DNS/environment change or external message was performed.
