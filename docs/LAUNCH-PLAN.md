> **Current policy — October 19, 2026:** Development is local only. Historical sharing/deployment steps below are not authorization to publish. Follow [DEPLOYMENT_POLICY.md](DEPLOYMENT_POLICY.md) and [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md). Phase 0 report: [PHASE_0_REPORT.md](PHASE_0_REPORT.md).

# MixerMates launch plan

Status reviewed October 18, 2026 from the current source and verification records. Product remains branded VIBEY in the interface. The five-palette experiment was reverted. Hostinger build settings have been discussed, but a successful mixermates.com deployment has not been independently confirmed.

## Already implemented

- Phone-first event discovery, filters, map, event detail pages and saved events.
- Signup, password login/logout, editable profiles and privacy preferences.
- Friends, requests, follows, blocks, reports and stored messages.
- Event creation, ticket tiers, private registration questions, organizer review and staff check-in.
- Pending invitations, approval/rejection, generated reference barcodes and secure QR tickets, duplicate-entry protection and attendance passport.
- Organizer/admin interfaces, basic stored analytics and in-app notifications.
- Database migrations, fictional seed data, source ZIP, setup documentation and public design assets.

Recorded validation: 26 application tests passed, production builds/type checks passed, and desktop/phone/tablet browser journeys were checked. The two extra palette tests were removed with that experiment. This is working-MVP evidence, not production certification.

## Phase 1 — Get a durable private staging deployment

Owner: hosting friend; product owner chooses hosting budget and confirms domain access.

1. Provision Node.js hosting and deploy the source. Confirm root directory, Node 22, Prisma generation, migrations, build and runtime configuration.
2. Choose persistence before adding real accounts. Recommended managed direction: PostgreSQL plus durable public/private object storage. This requires changing the current Prisma SQLite provider, generating provider-specific migrations and verifying queries/transactions. An initial VPS can retain SQLite and persistent upload directories with backups, but concurrency still needs testing.
3. Ensure database and uploads survive rebuilds/redeploys. Do not put persistent data inside replaced build folders. Back up and restore a test dataset to prove recovery works.
4. Set HTTPS, canonical domain, www redirect, APP_ORIGIN and environment variables. Preserve existing email DNS records when changing website DNS.
5. Create controlled accounts and restricted administrator provisioning. Do not import the local database or publish known seeded administrator credentials.

Exit gate: mixermates.com loads over HTTPS; signup/login works; a test record and image survive a redeploy; a backup restores successfully; private receipts cannot be fetched by another account.

## Phase 2 — Make a free-event beta ready

Owner: development team with product-owner decisions.

1. Confirm public name (MixerMates or VIBEY), logo, canonical email address, initial city and target event categories. Reuse the current visual system until these decisions are fixed.
2. Replace fictional events, venues, organizer claims and placeholder content with permissioned content for real pilot events.
3. Connect email verification and password-reset delivery. Password recovery currently has no production email service.
4. Separate real free RSVP/approval behavior from DEMO_MODE. Hide simulated paid checkout, refunds and payouts from ordinary beta users.
5. Finish event cancellation, attendee cancellation, rejection messaging, capacity recovery and expiration of abandoned/pending reservations. Define each policy before implementing it.
6. Define organizer verification and moderation ownership. A profile badge alone is not identity verification. Give staff only their assigned event permissions.
7. Establish privacy, terms, event/refund rules, support contact and retention/deletion procedures, with appropriate professional review for the intended market and activities.

Exit gate: a new attendee can verify email, recover access, register for a free event, receive a decision and ticket, enter once, and cancel or get support without developer intervention.

## Phase 3 — Reliability and real-world testing

Owner: hosting friend/development team; product owner recruits pilot users and event staff.

- Add error monitoring, uptime checks, structured logs, automatic backups and a deployment rollback procedure.
- Add shared rate limiting and signup/login/upload quotas. Re-encode uploaded images and enforce private-file access and retention.
- Review dependencies, security headers, permissions and abuse/report handling. Test cross-account and cross-event authorization after the hosting/database change.
- Test iPhone Safari and Android Chrome, poor mobile connections, physical-camera scanning, staff assignment, repeated scans, sold-out events, simultaneous registrations, rejected invitations and cancellation.
- Have a small invited group use real devices. Run one controlled event with a manual attendance fallback and a named support person.

Exit gate: no unresolved issue that prevents login, registration, ticket access or entry; no known private-data exposure; restore/rollback and support procedures are usable.

## Phase 4 — Paid events, only after the beta works

Owner: product owner and payment/engineering specialists.

Choose a supported merchant/payment arrangement and define who receives funds, platform fees, refunds, event cancellations, chargebacks and organizer settlements. Replace simulations with verified provider webhooks, idempotency, payment reconciliation and audited refund/settlement flows. Complete required provider onboarding and professional review before accepting real money. Never mark a booking paid only because the browser returned to a success page.

Exit gate: payment success/failure/refund/cancellation and duplicate webhooks are tested against the provider; records reconcile with actual provider transactions; operational responsibility is assigned.

## What the product owner should do next

1. Confirm the permanent name and decide that the first launch is a free-event pilot.
2. Ask the hosting friend to complete Phase 1 and report the final URL, database/storage choice and redeploy-persistence test result.
3. Supply a support email, approved imagery and details for the first real pilot events.
4. Assign one administrator, one organizer and door staff; recruit a small group of testers.
5. Prioritize launch blockers from the pilot. Leave new palettes, subscriptions, recommendations, live chat, offline mode and push notifications for later.

No fixed completion percentage or delivery date is asserted. Estimate implementation only after the hosting/storage decision and pilot scope are confirmed. A working test link can precede production readiness; real-money launch is a separate milestone.
