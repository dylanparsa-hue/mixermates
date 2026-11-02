# MixerMates project requirements

## Current Phase 4 status — October 20, 2026

The Phase 4 owner brief adds scoped customer booking, dynamic registration, private organizer-direct payment evidence, separate financial/registration/BYOB review, existing ticket issuance, history/notices and server expiry. Implemented and tested only with explicit fictional local data. Public Coming Soon is preserved. Production access/sales remain locked; actual event/recipient/policy facts are not supplied by test fixtures.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

Status: Phase 0 baseline, October 19, 2026, Asia/Kuala_Lumpur. Owner target: October 20, 2026 by night; exact cutoff time still needs confirmation. This is a full-stack platform, not a static prototype. The original Phase 0 brief is preserved verbatim in the normative appendix below so no requirement depends on old screenshots or message.txt.

## Product and launch boundary

MixerMates combines Malaysian nightlife/music event discovery, individual event creation, organizer ticketing and opt-in social networking with a Verified Event Passport. Audience: nightlife enthusiasts, university students, young adults, concertgoers, electronic music fans and festival attendees. Categories include house/private parties, nightclubs, DJs, EDM, house, techno, concerts, live music, festivals and entertainment. Individual event age rules override general account eligibility.

P0 launch is an authorized private-event registration and ticket-selling service behind a public Coming Soon experience. Preserve implemented P1 features locally; their existence does not justify public exposure before readiness. Do not rebuild the app. P2 VIP tables, subscriptions, gateways, automated commissions and provider-supported settlement must not delay launch.

## Normative feature inventory

`FEATURE_CHECKLIST.md` and `phase0/feature-inventory.json` enumerate every A–N business/technical category plus release and Halloween requirements. IDs A-001 onward are stable; append rather than renumber. Each row carries priority, status, implementation path, dependencies, acceptance and test evidence. All categories are in scope for requirements, while only missing P0 work is in the urgent build scope.

## Public and privileged access

Public visitors see only official branding, an accessible animated Coming Soon background, “Your Next Night Starts Here.” and “Discover events. Meet your people. Make every night count.” Optional social links and waitlist require approved destinations and consent/storage rules. No Phase 1 implementation occurs in Phase 0.

Design independent server-enforced controls: `SITE_MODE=coming_soon|preview|open` and `TICKET_SALES_MODE=disabled|invite_only|open` (names beyond the supplied example are proposed). Default safely when invalid or absent in a launch environment. Admins can test the full application. Authorized organizers see only owned/assigned management operations. Customers with approved event links can access only the event-specific registration, payment, booking history and ticket resources they are authorized to use. A shared URL alone must not disclose private venue or grant unrestricted main-site access. Revocation, expiration, reuse and forwarding policies must be explicit. Protect pages, route handlers, public event/media endpoints and cached metadata; hiding navigation is insufficient.

## Identity, roles and privacy

Keep account registration/login, bcrypt password hashes, revocable hashed sessions and server authorization. Complete recovery delivery, secure initial admin provisioning and privileged-account controls before real use. Adult social eligibility and each event's age limit are enforced on the server. Organizer verification badges require actual evidence review and a traceable decision, not demo flags. Identity/IC images are not required by the supplied form; avoid collecting them without a separate justified decision.

Attendance is private by default. Users explicitly opt into discoverability and per-event public attendance. Revoking either applicable consent must remove discovery. Never expose private guest lists, receipt files, full birth dates, contact details or entry tokens. Minors require additional protections. Retain block/report/moderation and friendship-only messaging foundations. Event Passport is based on verified attendance, not ticket purchase. Public ticket share images must omit entry credentials and sensitive location.

## Event and organizer requirements

Create/edit drafts, configure ticket tiers/prices/capacity, photos, category/genre, dates, age restriction, availability, registration questions and private location. Preserve event ownership; add auditable event publishing/payment-detail approval and organizer identity/legitimacy/venue-authorization checks. Edit behavior must preserve booking history and snapshots rather than silently mutate purchased terms. Support multi-event management, registration review, private guest lists, exports, receipt review and event-scoped check-in staff. Staff management needs explicit least-privilege capabilities; finance and customer proof access must be separately restricted. Cancellation must stop sales, prevent entry, notify customers and track organizer-owned refunds.

## Initial payments: organizer-direct QR only

No platform custody, escrow, automated settlement or organizer payout mechanism. Organizers upload their own current Touch ’n Go, DuitNow or supported bank QR and recipient information. Admin reviews it before customers can see it for real payment. Version changes, reviewer/reason/timestamp and immutable booking recipient/QR snapshots are required. A screenshot is evidence submitted by a customer, not confirmation of incoming money.

Customer selects ticket → sees approved recipient/QR and correct amount → pays externally → submits private proof → payment review pending → organizer independently checks incoming funds → organizer confirms funds → required invitation/registration approval → issue unique valid ticket → notify customer. Receipt collection must support suspicion/duplicate detection, reconciliation and rejection/correction. Refund requests record owner responsibility and external completion evidence; updating a database row does not transfer money.

Model separate payment, registration, inventory and admission states. Suggested payment states: NOT_REQUIRED, AWAITING_PROOF, PENDING_REVIEW, CONFIRMED, REJECTED, REFUND_REQUESTED, REFUNDED_EXTERNALLY. Suggested registration states: PENDING, AWAITING_PAYMENT, AWAITING_APPROVAL, APPROVED, REJECTED, CANCELLED, EXPIRED. Ticket states: NOT_ISSUED, ACTIVE, CHECKED_IN, REVOKED. These are proposed requirements for Phase 2 review, not schema changes performed now. Transitions must be atomic/idempotent and audited; no active paid credential before all requirements pass.

Inventory reservations require finite expiration and race-safe release. Confirm stock behavior when receipt review is delayed. Test parallel last-seat bookings, retries, duplicate evidence and QR version changes. Currency uses integer sen. No commercial percentage is approved by the existing demo's 500-basis-point default.

## Halloween launch contract

`HALLOWEEN_EVENT_SPEC.md` is the authoritative structured spec. Provisional October 29, 2026; the year is unconfirmed. Private invitation only, 18+, exact location withheld. Required IC-name, age, Instagram, entry selection and one proof file up to 10 MB; inviter optional. RM35 and BYOB (four beers OR two sojus OR a bottle) relationship must be confirmed. Historical recipient/QR must not be republished. Unknown time, venue, capacity, refunds, current QR and year block live checkout. Fictional seeded venue/times/VIP pricing are demo data, not source facts.

## Discovery, social and marketing

Preserve city/category/date/venue/genre search, event art/descriptions/performers, pricing/availability, map, saves, trending and recommendations, account booking history, tickets and notifications. P1 adds richer discovery, profiles, Passport, friends/followers, messaging, promotions and analytics without weakening consent. Booking notifications are P0; promotional notices need preference enforcement. Human Instagram/TikTok campaigns, partnerships, organizer recruitment and costs have human owners distinct from software completion. Per-event SEO must not reveal private event metadata.

## Brand and experience

Use the existing official full logo and connected M symbol; never substitute a generic icon. Assets are present, unmodified in Phase 0. Preserve midnight/navy signature dark mode and snow/lavender light mode, restrained purple→violet→pink accents, Manrope/Oxanium typography, photography, minimal profiles, QR-safe tickets and quiet organizer data layouts. Existing sampled brand tokens take precedence over approximate brief hexes. Shared semantic tokens, Light/Dark/System, persistence, before-paint initialization, reduced motion, visible keyboard focus and mobile-first layout remain requirements. Test small phones, desktop, keyboard, screen readers and physical-device scanners; an emulated viewport does not prove touch/camera behavior.

## Reliability, security and operations

Role/object authorization on every endpoint; private byte storage; upload type/size/ownership validation; durable audit trails; origin/session abuse controls; rate limits effective across instances; backup/restore; monitored failures; safe migrations/rollback; error/transaction monitoring; traffic planning and outage check-in procedures. No legal compliance claim without external review of Malaysian data protection, event/venue licensing, age/ID procedures, payment handling, terms, refunds, responsibility and insurance. Operational owners must cover receipts, support, disputes, refunds, cancellations and incidents. Costs, revenue, break-even and ticket volumes are decisions, not invented figures.

## Development and release policy

Phase 0 changes documentation and isolated test preparation only. No production deployment, DNS change, production database writes, hosting/environment edits or auto-deploy push. Future phases remain local. Coming Soon may be deployed once only after explicit owner approval; final application deployment requires critical acceptance and fresh explicit approval. See DEPLOYMENT_POLICY.md. Wait for the separate Phase 1 prompt after this report.

## Complete normative Phase 0 brief

The following owner-supplied brief is retained in full for requirement traceability. It is a source specification, not authorization to execute future phases in this audit.

---

# MIXERMATES — PHASE 0
# COMPLETE PROJECT AUDIT, REQUIREMENTS AND LOCAL DEVELOPMENT

PROJECT: MixerMates
PHASE: 0 of 11

DEADLINE:
October 20, 2026, by night.
Timezone: Asia/Kuala_Lumpur.

PROJECT TYPE:
Full-stack nightlife event discovery, event ticketing,
social networking and event organizer management platform.

YOUR ROLE:
You are my senior full-stack developer, software architect,
database engineer, security engineer, QA engineer and
technical project manager.

Your responsibility in this phase is to understand my
existing website, identify all missing functionality,
prepare the complete project requirements and establish
a safe local development workflow.

Do not rebuild the project from scratch.

Do not remove existing working features.

Do not deploy anything in this phase.

============================================================
SECTION 1 — CRITICAL DEVELOPMENT RULES
============================================================

READ THESE RULES BEFORE TAKING ANY ACTION.

RULE 1 — LOCALHOST DEVELOPMENT ONLY

All development must happen on my local computer.

You must:

- Inspect the local project.
- Use the existing development environment.
- Run the development server locally.
- Test changes through localhost.
- Preserve existing production functionality.
- Keep production data separate from test data.

You must NOT:

- Automatically deploy changes.
- Upload changes to my domain.
- Execute production deployment commands.
- Modify production databases.
- Change production DNS.
- Push code to a branch that automatically deploys.
- Modify production environment variables.
- Replace the existing production website.

Do not run commands such as:

vercel --prod
netlify deploy --prod
firebase deploy

Or equivalent production deployment commands.

Do not trigger deployment through a Git push.

If the project has automatic deployment configured,
identify how it works.

Use a safe local development branch or workflow
that does not trigger production deployments.

Never change hosting or CI/CD settings without
first explaining the consequences.

RULE 2 — COMING SOON EXCEPTION

In Phase 1, we will create an animated Coming Soon page.

That page may be deployed to the actual domain ONCE,
but only after I explicitly approve its deployment.

Once the Coming Soon page is live:

ALL OTHER DEVELOPMENT REMAINS LOCAL.

The actual website will be developed, tested and
completed on localhost.

Do not repeatedly redeploy after each feature.

The final full website will only be published when:

1. Critical features work.
2. Security tests pass.
3. Ticket purchase flow works.
4. Organizer payment approvals work.
5. QR ticket validation works.
6. I explicitly approve final deployment.

RULE 3 — NEVER ASSUME A FEATURE WORKS

An existing page does not mean that its functionality
has been completed.

Inspect backend logic, database operations,
authorization, UI behavior and tests.

Mark features complete only after verification.

RULE 4 — PRESERVE EXISTING WORK

Before changing files:

Inspect their purpose.

Understand dependencies.

Avoid breaking existing features.

Use the project's existing technology stack unless
there is a compelling reason to change it.

RULE 5 — WORK PHASE BY PHASE

This prompt covers PHASE 0 ONLY.

Do not implement Phases 1 through 11 yet.

However, prepare the complete requirements and
development plan for all future phases.

Once Phase 0 is completed, provide a detailed report.

Wait for the separate Phase 1 master prompt.

============================================================
SECTION 2 — UNDERSTAND THE PRODUCT
============================================================

The platform is called:

MixerMates

MixerMates is a premium event discovery and social
networking platform focused on nightlife and music.

The platform will initially serve Malaysia.

Event categories include:

- House parties
- Private parties
- Nightclubs
- DJ performances
- EDM
- House music
- Techno
- Concerts
- Live music
- Music festivals
- Entertainment events

Users should be able to:

1. Discover events.
2. Search for events.
3. Filter events by location and category.
4. Register for free events.
5. Purchase tickets for paid events.
6. Access digital QR tickets.
7. Attend events.
8. Build personal profiles.
9. Connect with other event attendees.
10. Discover people with similar interests.
11. Create and manage their own events.

Event organizers should be able to:

1. Create events.
2. Configure ticket types.
3. Set event capacity.
4. Upload promotional images.
5. Publish events.
6. Upload their payment QR codes.
7. Receive ticket registration requests.
8. Review payment receipts.
9. Approve or reject registrations.
10. Issue digital tickets.
11. View guest lists.
12. Scan tickets.
13. Monitor attendance.
14. View event statistics.
15. Manage multiple events.

The long-term vision includes:

Club partnerships.
VIP table reservations.
Paid event promotions.
Organizer subscriptions.
User subscriptions.
Integrated payment gateways.
Provider-supported delayed organizer payouts.

These future features must not delay the
initial ticket-selling website.

============================================================
SECTION 3 — OFFICIAL BRAND IDENTITY
============================================================

The brand name is:

MixerMates

There are two official logo concepts.

LOGO 1:

Full MixerMates logo.

It contains a flowing M-shaped symbol above
the MixerMates wordmark.

The symbol uses a purple-to-pink gradient.

"Mixer" is white.

"Mates" is vibrant pink.

The original reference has a dark navy background.

LOGO 2:

Standalone M-shaped gradient symbol.

The reference uses a black background.

The symbol may not be perfectly centered
within its original image.

The original assets should be available in the project.

Search for files such as:

mixermateslogo.png

And MixerMates JPG logo files.

If the files exist, identify their exact paths.

Do not alter them during Phase 0.

If they are missing, record this as an asset blocker.

Do not fabricate an inaccurate replacement.

BRAND COLORS:

Deep Navy:
#101632

Midnight:
#090B18

Black:
#000000

Electric Purple:
#652BF5

Violet:
#A81DF1

Hot Pink:
#ED00DC

White:
#FAFAFF

Soft Lavender:
#F5F1FF

These are approximate brand colors.

The final theme should match the original logo gradient.

DESIGN DIRECTION:

Premium nightlife.
Futuristic.
Minimal.
Elegant.
Visually striking.

Both light and dark modes are required.

Dark mode should be the signature visual experience.

Light mode should use white and pale lavender
surfaces with dark typography.

Use the purple-to-pink gradient selectively.

Avoid excessive glow and neon.

Do not make the interface cluttered.

The user has previously provided references featuring:

- Cinematic event discovery pages.
- Large event photography.
- Beautiful event cards.
- Premium black and purple interfaces.
- Clean light-mode layouts.
- Elegant social profiles.
- Profile achievement badges.
- Digital ticket designs.
- Visual event calendars.
- Modern organizer dashboards.

This description must be sufficient to preserve
the intended direction even if the original
reference images are unavailable.

============================================================
SECTION 4 — TEMPORARY PUBLIC WEBSITE STRATEGY
============================================================

We need a Coming Soon page.

The Coming Soon page is the only public-facing
experience during development, apart from
explicitly authorized event booking links.

Public visitors should see:

MixerMates branding.

A premium animated background.

The headline:

"Your Next Night Starts Here."

Supporting text:

"Discover events. Meet your people.
Make every night count."

Optional social links and waitlist.

All unfinished application pages remain hidden.

ADMINS:

Admins can log in and access the full website
for testing.

ORGANIZERS:

Authorized organizers can access only their
permitted management functionality.

EVENT CUSTOMERS:

Customers with valid approved event links can
access the relevant registration, payment and
ticketing pages.

They must not access the unfinished main website.

The system must support independent controls for:

Public website mode.

Ticket-selling availability.

For example:

SITE_MODE=coming_soon

TICKET_SALES_MODE=invite_only

These settings must use proper server-side
authorization and route protection.

Do not rely only on hiding frontend navigation.

This implementation belongs to Phase 1.

During Phase 0, audit whether any suitable
functionality already exists.

============================================================
SECTION 5 — PAYMENT SYSTEM REQUIREMENTS
============================================================

This section is extremely important.

For the initial launch, we are NOT integrating
a traditional payment gateway.

Instead, organizers can upload their own
payment QR codes.

Supported examples include:

Touch 'n Go.
DuitNow QR.
Supported bank payment QR codes.

The customer pays the event organizer directly.

MixerMates does NOT receive or hold the money.

Do not implement an escrow system.

Do not implement automatic organizer payouts.

Do not claim the platform has verified settlement
based only on a screenshot.

PAYMENT FLOW:

1. Organizer creates an event.
2. Organizer adds ticket prices.
3. Organizer uploads a payment QR.
4. Admin reviews and approves payment details.
5. Customer selects a ticket.
6. Customer sees the organizer's approved QR.
7. Customer pays using their banking or wallet app.
8. Customer uploads a payment receipt.
9. Registration is marked pending.
10. Organizer independently checks incoming funds.
11. Organizer confirms payment.
12. Organizer approves registration if necessary.
13. System issues a valid ticket.
14. Customer can access the ticket QR.

Organizers must be able to manage their own QR codes.

However, unreviewed QR codes must not automatically
become publicly available for real ticket payments.

Provide support for an organizer changing payment
details while preserving accurate booking records.

Track payment review history.

Create clear booking/payment states.

No valid paid ticket should be issued before
the required payment verification and approvals.

FUTURE PAYMENT MODEL:

Eventually MixerMates may integrate a licensed
payment provider with appropriate support for
platform commissions, settlement and delayed payouts.

Do not implement this yet.

Record it as a future requirement.

============================================================
SECTION 6 — HALLOWEEN EVENT: COMPLETE SOURCE DETAILS
============================================================

This is our initial real-world event example.

The following information comes from the previously
supplied Halloween Google Form screenshots.

You do not need the screenshots to reproduce
these known requirements.

EVENT NAME:

Halloween Party

FORM TITLE:

Halloween Party Info + Registration

MAIN HEADING:

HALLOWEEN NIGHT – OCTOBER 29 🎃

EVENT DATE:

October 29.

Use October 29, 2026 as the provisional date
for the current development project.

IMPORTANT:
The screenshots themselves do not establish
the year.

The organizer must confirm the year before
publishing the real event.

EVENT CATEGORY:

Private House Party / Halloween

ACCESS:

Strictly private.

Invitation-only.

The form explicitly asks guests not to forward
the invitation without permission from the hosts.

MINIMUM AGE:

18+.

Identification will be checked at the entrance.

EVENT LOCATION:

The exact location is not publicly disclosed.

The organizers will provide the location and
other relevant event information to confirmed
guests closer to the event.

Do not invent a venue or address.

Do not display a fake precise map pin.

REGISTRATION REQUIREMENTS:

The original form includes the following fields.

FIELD 1:

Full name as stated on IC.

Required.

FIELD 2:

Age (18+ only).

Required.

The form explicitly states that IDs will
be checked at entry.

FIELD 3:

Instagram username.

Required.

FIELD 4:

Who invited you?

Optional in the screenshots.

FIELD 5:

Entry Fee or BYOB?

Required multiple-choice field.

The visible options are:

Option A:

Entrance Fee of RM35.

Option B:

BYOB.

BYOB REQUIREMENTS:

The form states a minimum of:

4 beers

OR

2 sojus

OR

a bottle.

IMPORTANT PAYMENT AMBIGUITY:

The form presents RM35 entrance and BYOB as
different options.

However, it does not establish with complete
certainty whether BYOB is an alternative to
paying the entrance fee or an additional condition.

Do not invent the answer.

The event configuration must allow the organizer
to confirm the correct relationship.

Do not enable live checkout with ambiguous
payment rules.

FIELD 6:

Submission of receipt / BYOB proof.

Required.

The form instructs guests to:

Pay RM35 using the provided Touch 'n Go QR
when applicable.

Include their full name for identification.

Upload evidence of payment.

For BYOB:

Submit proof of the bottle or contact the hosts
with the planned alcohol to be brought.

The screenshot allows one supported file,
up to 10 MB.

Use this limit as the initial configuration
for the Halloween event.

PAYMENT METHOD:

Touch 'n Go eWallet.

The screenshot displays a QR recipient name:

ADAM BIN MARZUKI

IMPORTANT:

Treat this as historical information from
the reference screenshot.

Do not assume the recipient is still correct.

Do not recreate or publish the original QR
from the screenshot.

For live checkout, the verified organizer must
upload and approve the correct payment QR
and confirm the recipient details.

The customer's spot is only secured after
the required payment and registration
verification are completed.

REGISTRATION APPROVAL:

The organizer reviews the submission.

Only approved guests are added to the
confirmed guest list.

The website must support:

Pending registration.
Pending payment review.
Payment confirmed.
Awaiting organizer approval.
Approved registration.
Rejected registration.
Ticket issued.
Checked in.

Ticket issuance must respect both payment
and invitation approval requirements.

SUGGESTED HALLOWEEN PAGE:

Use a premium dark-purple Halloween theme.

Create an immersive event cover.

Display:

Halloween title.
Date.
Age requirement.
Entry options.
Invitation-only notice.
Registration requirements.
Organizer information.
Registration button.

Do not expose the exact location before approval.

SUGGESTED DIGITAL TICKET:

MixerMates branding.
Halloween artwork.
Attendee name.
Ticket option.
October 29 date.
Unique QR.
Ticket reference.
Confirmation status.

Do not create a valid real-event ticket
without the required approvals.

TESTING:

Create fictional demo attendee records.

Create a demo organizer.

Allow the complete registration flow to be tested.

Test tickets must remain separate from
real admission tickets.

IMPORTANT:

The platform should replace the need for the
external Google Form.

Do not attempt to submit registrations to
the original Google Form.

Use our own database-backed form.

The original source does not specify:

Exact event starting time.
Exact ending time.
Exact location.
Final ticket capacity.
Confirmed event year.
Full refund policy.
Definitive BYOB fee relationship.
Current authorized payment QR.

All unknown fields must remain configurable.

Do not invent these details.

============================================================
SECTION 7 — COMPLETE FEATURE INVENTORY
============================================================

This section incorporates the previously supplied
message.txt business and development requirements.

Create a comprehensive feature checklist covering
EVERY category below.

Assign stable feature IDs to individual items.

Classify each item:

P0 — Essential before real ticket sales.
P1 — Important for the full initial platform.
P2 — Future expansion.
DECISION — Business or legal decision requiring input.

------------------------------------------------------------
CATEGORY A — BUSINESS MODEL
------------------------------------------------------------

Track:

Free event publishing.
Ticket sales commission.
Commission percentage configuration.
Possible VIP booking commission.
Optional organizer listing fees.
Paid event promotion.
Featured listings.
Possible customer service fees.
Responsibility for processing fees.
Organizer-direct QR payments.
Future platform-controlled settlement.
Future organizer payouts.
Refund handling.
Chargebacks for future integrated payments.
Financial reconciliation.
Platform revenue reporting.
Premium organizer subscriptions.
Future premium user subscriptions.

Do not invent commercial fee percentages.

Unknown prices and rates should be configurable
or marked as decisions.

------------------------------------------------------------
CATEGORY B — TARGET MARKET
------------------------------------------------------------

Initial market: Malaysia.

Support city-based event discovery.

Target users include:

Nightlife enthusiasts.
University students.
Young adults.
Concert attendees.
Electronic music fans.
Festival attendees.

Support individual event age restrictions.

Track:

Affordable ticket events.
Exclusive events.
VIP events.
Differentiation from existing ticket websites.

Our major differentiation is the combination of:

Event discovery.
Social networking.
Verified Event Passport.
Individual event creation.
Organizer ticketing tools.

------------------------------------------------------------
CATEGORY C — ORGANIZERS
------------------------------------------------------------

Track:

User becomes organizer.
Create event.
Edit event.
Manage event.
Organizer verification.
Event publishing approval.
Organizer profile.
Event ownership.
Event staff permissions.
Organizer identity checks.
Organizer legitimacy.
Organizer agreements.
Event cancellation process.
Venue authorization.
Ticket pricing control.
Ticket capacity control.
Event availability control.
Multiple-event management.
Organizer recruitment.

Any verified organizer badge must represent
a genuine verification workflow.

------------------------------------------------------------
CATEGORY D — TICKETING
------------------------------------------------------------

Track:

General admission.
Early Bird tickets.
VIP admission.
Multiple ticket tiers.
Group ticket bundles.
Ticket quantity limits.
Real-time availability.
Ticket inventory reservations.
Expiration of unpaid bookings.
Digital ticket issuance.
Secure unique QR tokens.
QR ticket scanning.
Duplicate ticket prevention.
Email or in-app confirmations.
Booking history.
Ticket transfers.
Ticket name changes.
Refund and cancellation status.
Manual check-in.
Internet outage contingency procedures.
Attendance records.

A ticket purchase does not automatically
count as event attendance.

Attendance must be verified.

------------------------------------------------------------
CATEGORY E — VIP TABLES
------------------------------------------------------------

This category is important for future expansion.

Track:

Individual table booking.
Section reservation.
Venue floor plans.
Specific table selection.
Table pricing.
Minimum spending.
Deposits.
Full prepayment.
Deposit deduction from final bill.
Table capacity.
Extra guest policies.
Optional add-ons.
Drinks packages.
Reservation hold periods.
Double-booking prevention.
Venue allocation changes.
Late arrivals.
No-shows.
Cancellation rules.
Refund rules.

Classify these as P2 unless a live event
specifically requires them.

Do not implement them during the urgent
Halloween ticket-selling sprint.

------------------------------------------------------------
CATEGORY F — PAYMENTS
------------------------------------------------------------

P0:

Organizer-direct QR payment.
Organizer QR management.
Payment QR verification.
Payment instructions.
Receipt upload.
Manual payment review.
Manual payment confirmation.
Payment status tracking.
Booking reconciliation.
Refund request records.
Suspicious payment flagging.
Duplicate payment prevention.
Ticket issuance after approval.

P2:

Payment gateway integration.
Credit cards.
Online banking.
Integrated e-wallets.
Automated fee deductions.
Provider-supported delayed payouts.
Automated refunds.
Automated settlement.
Chargeback handling.

Do not treat direct organizer QR transfers as
platform-controlled payments.

------------------------------------------------------------
CATEGORY G — WEBSITE EXPERIENCE
------------------------------------------------------------

Track:

Mobile-first interface.
Responsive desktop interface.
Fast loading.
Beautiful event categories.
Event search.
Search by city.
Search by date.
Search by venue.
Search by genre.
Event photography.
Event descriptions.
DJ/performer information.
Ticket prices.
Ticket availability.
Simple checkout.
User accounts.
Booking history.
Digital tickets.
Booking confirmation.
Cancellation information.
Secure authentication.
Consistent MixerMates branding.
Light mode.
Dark mode.
Theme persistence.
Interactive event map.
Saved events.
Trending events.
Personalized recommendations.

------------------------------------------------------------
CATEGORY H — ORGANIZER DASHBOARD
------------------------------------------------------------

Track:

Event creation.
Event editing.
Photo uploads.
Ticket price management.
Capacity controls.
Discount codes.
Registration management.
Payment receipt reviews.
Confirmed ticket sales.
Revenue reporting.
Guest list.
Guest list export.
Entrance ticket scanning.
Check-in statistics.
Staff management.
Multiple events.
Venue management.
Refund requests.
Cancellation handling.
Event analytics.
Promotion analytics.
Future payout reporting.
Future VIP booking management.

------------------------------------------------------------
CATEGORY I — MARKETING
------------------------------------------------------------

Track:

Instagram marketing.
TikTok marketing.
SEO.
Event landing-page metadata.
DJ partnerships.
Promoter partnerships.
Organizer acquisition.
Referral programs.
Personalized event recommendations.
Upcoming event reminders.
User retention.
Event guides.
Featured event placements.
Paid promotions.
User acquisition tracking.
Marketing cost reporting.

Distinguish website functionality from
business activities that require human work.

------------------------------------------------------------
CATEGORY J — LEGAL, SAFETY AND TRUST
------------------------------------------------------------

Track:

Business registration decisions.
Terms and conditions.
Privacy policy.
Refund and cancellation policy.
Organizer responsibility.
Platform responsibility.
Organizer verification.
Fraudulent event reporting.
Event licensing responsibilities.
Venue licensing considerations.
Age restrictions.
ID checking.
Safety reporting.
Private event location protection.
Guest list privacy.
Malaysian data protection requirements.
Payment handling requirements.
Appropriate insurance considerations.
Customer complaint handling.
Moderation.
Blocking and reporting users.

Never declare legal compliance without
appropriate external review.

------------------------------------------------------------
CATEGORY K — SECURITY AND TECHNOLOGY
------------------------------------------------------------

Track:

Secure hosting.
Database persistence.
Role-based authorization.
Session security.
Password hashing.
Secure QR tickets.
Prevention of duplicate check-ins.
Overselling prevention.
Database transactions.
Backups.
Error monitoring.
Transaction failure monitoring.
Private file storage.
Rate limiting.
Fraud prevention.
Mobile testing.
Traffic spike planning.
Data recovery.
Production logging.
Audit logs.
End-to-end tests.
Deployment rollback procedure.

------------------------------------------------------------
CATEGORY L — OPERATIONS AND COSTS
------------------------------------------------------------

Track:

Hosting provider.
Monthly hosting costs.
Software subscription costs.
Payment processing costs.
Customer support.
Organizer support.
Dispute management.
Manual payment verification ownership.
Refund handling responsibilities.
Event cancellation support.
Website downtime procedures.
Incident response.
Revenue targets.
Break-even estimates.
Required ticket volumes.
Expansion to new cities.

------------------------------------------------------------
CATEGORY M — SOCIAL NETWORKING
------------------------------------------------------------

Track:

User profiles.
Profile customization.
Instagram username.
Following.
Friends.
Friend requests.
Mutual friends.
Private messaging.
Music interests.
Interest-based recommendations.
Event-based user discovery.
Optional public event attendance.
Per-event attendance privacy.
Event Passport.
Verified attendance.
Achievement badges.
Event memories.
Blocking and reporting.

CRITICAL PRIVACY RULE:

Attendance is private by default.

Users must explicitly agree before other
people can discover them through an event.

Do not expose private attendee lists.

Underage users require additional protection.

------------------------------------------------------------
CATEGORY N — NOTIFICATIONS
------------------------------------------------------------

Track:

Registration submission.
Booking confirmation.
Payment proof received.
Payment approval.
Payment rejection.
Ticket issued.
Event changes.
Event cancellation.
Upcoming event reminders.
Friend requests.
Private messages.
Private invitations.
Favorite organizer updates.
Trending events.
Almost-sold-out events.
Notification preferences.

Important booking notifications must work
before launch.

Promotional notifications require suitable
user preferences and consent.

============================================================
SECTION 8 — INSPECT THE EXISTING APPLICATION
============================================================

Now inspect the actual project.

Identify:

Current framework.
Frontend architecture.
Backend architecture.
Database.
ORM.
Authentication library.
File storage.
Current environment variables.
Hosting configuration.
Git configuration.
Deployment configuration.
Existing features.
Existing incomplete features.
Testing setup.
Known technical debt.

Determine whether the website currently has:

Working homepage.
Event listing.
Event details.
Event creation.
Ticket booking.
Payment QR uploads.
Receipt uploads.
User registration.
Organizer dashboards.
Admin dashboards.
Social profiles.
QR code generation.
Ticket scanning.
Notifications.
Light and dark themes.

For each feature, classify:

NOT STARTED
IN PROGRESS
NEEDS VERIFICATION
COMPLETED AND TESTED
BLOCKED
DEFERRED

Do not guess implementation status.

Base results on code inspection and tests.

============================================================
SECTION 9 — CREATE PROJECT DOCUMENTATION
============================================================

Create the following documents.

DOCUMENT 1:

docs/PROJECT_REQUIREMENTS.md

Include:

Complete product description.
Current launch scope.
Event discovery features.
User accounts.
Organizer functionality.
Ticketing.
Manual QR payment system.
Social features.
Admin functionality.
Design requirements.
Security requirements.
Future expansion.

This must include all the requirements embedded
in this Phase 0 prompt.

DOCUMENT 2:

docs/HALLOWEEN_EVENT_SPEC.md

Include all supplied Halloween details.

Clearly separate:

Confirmed source information.
Configurable settings.
Unconfirmed details.
New MixerMates functionality.

This document must be detailed enough that
future coding phases do not need the original
Google Form screenshots.

DOCUMENT 3:

docs/FEATURE_CHECKLIST.md

Include every required feature.

Use:

Feature ID.
Description.
Priority.
Status.
Implementation path.
Dependencies.
Acceptance criteria.
Test result.

Provide a total feature count.

Group features logically.

DOCUMENT 4:

docs/PROJECT_AUDIT.md

Include:

Current project structure.
Existing functionality.
Missing functionality.
Broken functionality.
Technical risks.
Launch blockers.
Suggested implementation strategy.

DOCUMENT 5:

docs/DEVELOPMENT_PROGRESS.md

Include:

Current phase.
Completed work.
Current blockers.
Next actions.
Testing status.
Overall launch readiness.

DOCUMENT 6:

docs/LOCAL_DEVELOPMENT.md

Explain:

How to install dependencies.
How to run locally.
Which local URL to open.
How to configure the development database.
How to seed test data.
How to run tests.
How local development is separated
from production.

DOCUMENT 7:

docs/DEPLOYMENT_POLICY.md

Include the following binding project rule:

"No production deployments are allowed during
the development phases.

The only permitted early deployment is the
Coming Soon page, after explicit owner approval.

The complete application will be deployed only
after all critical launch tests pass and the
owner explicitly authorizes deployment."

Document any existing auto-deployment risks.

DOCUMENT 8:

docs/DECISIONS_REQUIRED.md

Include unresolved business decisions.

For example:

Final Halloween event time.
Event capacity.
Confirmed event year.
BYOB versus RM35 fee relationship.
Current organizer payment recipient.
Approved organizer QR.
Refund policy.
Customer support contact.
Exact permitted launch date.
Organizer commission percentage.
Any applicable legal review.

DOCUMENT 9:

docs/PHASE_PLAN.md

Include all development phases from 0 to 11.

Clearly identify dependencies between phases.

DOCUMENT 10:

docs/TEST_PLAN.md

List the tests required for each feature group.

Prioritize the complete customer booking flow.

============================================================
SECTION 10 — LOCAL DEVELOPMENT ENVIRONMENT
============================================================

Set up or verify local development.

Use the existing project's package manager.

Do not reinstall or replace the framework
unnecessarily.

Verify:

Dependencies install.
Development server starts.
Database connects.
Environment variables are available.
Existing pages load.
Existing API routes respond.
Tests can run.

Use localhost.

Use the port configured by the existing project.

Do not assume a specific port if it is already
configured differently.

Use development/test credentials.

Never expose secrets in documentation.

If a local database is unavailable, identify
a suitable development setup.

Do not point development tests at the
production database.

Do not make destructive schema changes.

Document any database migrations required
for the next phases.

============================================================
SECTION 11 — FEATURE PRIORITIES
============================================================

Create a strict launch priority order.

P0:

Coming Soon page.
Secure admin access.
Secure private event access.
User authentication.
Database reliability.
Event creation.
Ticket tiers.
Organizer payment QR.
Payment QR verification.
Ticket booking.
Payment receipt upload.
Manual payment approval.
Valid ticket issuance.
QR ticket scanning.
Duplicate-entry prevention.
Essential organizer dashboard.
Essential admin functionality.
Halloween event workflow.
Privacy and security.
Production readiness tests.

P1:

Full event discovery.
Advanced event filters.
Interactive map.
Complete profile design.
Event Passport.
Friends.
Followers.
Messaging.
Advanced notifications.
Paid promotions.
Advanced analytics.
Full visual polish.

P2:

VIP table reservations.
Venue partnerships.
Payment gateway integration.
Automated commissions.
Provider-supported delayed payouts.
Premium subscriptions.
Ticket transfers if not needed for launch.
Advanced referral systems.
International expansion.

IMPORTANT:

If a P1 feature is already implemented,
do not remove it.

If it is working, preserve it.

We are prioritizing missing work,
not deliberately reducing the website.

============================================================
SECTION 12 — DEADLINE STRATEGY
============================================================

The deadline is October 20, 2026, by night.

We need a reliable ticket-selling website.

Do not make unrealistic completion claims.

Estimate the remaining work based on
the actual codebase.

Identify which existing features can be reused.

Identify the most dangerous launch blockers.

Provide a recommended order of implementation.

Critical functionality must be working before
real customers are allowed to pay.

If time is limited, prioritize:

1. Secure Coming Soon.
2. Authorized event access.
3. Authentication.
4. Event creation.
5. Organizer QR payment configuration.
6. Receipt submission.
7. Payment approval.
8. Ticket generation.
9. QR scanning.
10. Event check-in.
11. Production security tests.

Visual effects, advanced social features,
and future integrations must not interfere
with completing critical ticketing.

============================================================
SECTION 13 — PHASE 0 ACCEPTANCE CRITERIA
============================================================

Phase 0 is complete only when:

[ ] Existing project has been inspected.

[ ] Current technology stack is identified.

[ ] Existing database has been inspected.

[ ] Current authentication has been inspected.

[ ] Existing event management has been inspected.

[ ] Existing ticketing has been inspected.

[ ] Existing payment functionality has been inspected.

[ ] Existing organizer dashboard has been inspected.

[ ] Existing admin dashboard has been inspected.

[ ] Existing social features have been inspected.

[ ] Existing deployment setup has been inspected.

[ ] Production auto-deployment risks are identified.

[ ] Local development workflow is documented.

[ ] The complete feature checklist exists.

[ ] All requirements in this prompt are recorded.

[ ] The Halloween event specification exists.

[ ] All known Halloween details are documented.

[ ] Missing event details are marked unresolved.

[ ] Business and legal decisions are documented.

[ ] The phase development plan exists.

[ ] The test plan exists.

[ ] The critical launch blockers are identified.

[ ] No production deployment occurred.

[ ] No production data was modified.

============================================================
SECTION 14 — REQUIRED FINAL REPORT
============================================================

After completing Phase 0, provide a report.

Use this format:

MIXERMATES — PHASE 0 REPORT

1. PROJECT STATUS

Explain the current state of the website.

2. TECHNOLOGY STACK

List the technologies already used.

3. WORKING FEATURES

List features that are implemented and verified.

4. INCOMPLETE FEATURES

List features that need additional development.

5. BROKEN FEATURES

List confirmed bugs.

6. CRITICAL LAUNCH BLOCKERS

Identify anything preventing real ticket sales.

7. DATABASE STATUS

Explain database readiness and migration needs.

8. AUTHENTICATION STATUS

Explain security and role-management readiness.

9. PAYMENT SYSTEM STATUS

Explain whether organizer-direct QR payments
can currently be supported.

10. TICKETING STATUS

Explain ticket issuance and QR scanning readiness.

11. CHECKLIST SUMMARY

Show the number of:

Completed features.
Incomplete features.
Blocked features.
Deferred features.

12. LOCAL DEVELOPMENT

Provide the local development URL and commands.

13. PRODUCTION SAFETY

Confirm whether any automatic deployment risk exists.

Confirm that no production deployment was performed.

14. NEXT PHASE

Explain the exact goals for Phase 1.

============================================================
FINAL INSTRUCTIONS
============================================================

Remember:

The project is MixerMates.

We are working toward a real ticket-selling platform.

We are not creating a static visual prototype.

Do not rebuild working functionality.

Do not deploy to the domain.

Do not modify production.

Do not ignore backend security.

Do not assume payments are verified from receipts.

Do not issue valid tickets without approvals.

Do not invent missing Halloween event details.

Do not ask me to resend message.txt.

Do not ask me to resend Halloween screenshots.

All known requirements from those sources are
already included in this prompt.

Your immediate task is to inspect the project,
prepare the documentation, create the feature
checklist and identify the next development steps.

This phase is primarily audit and preparation.

Do not implement the Coming Soon page yet.
That belongs to Phase 1.

Do not begin the complete backend rebuild yet.
That belongs to Phase 2.

Do not publish anything.

When Phase 0 is complete, stop and provide
the detailed Phase 0 report.

Wait for my separate Phase 1 instructions.

BEGIN PHASE 0 NOW.