# Phase 7 rehearsal status — October 27, 2026

Actual `halloween` remains DRAFT / UNCONFIRMED / sales paused and nonbookable. Separate fictional events rehearsed required IC-name, age, Instagram, RM35, identity-bound invitation, private proof, approved fictional recipient snapshot, separate funds/registration review, unique TEST ticket, ID acknowledgement, once-only admission and private Passport attendance. No actual date/venue/capacity/BYOB/recipient/QR/policy/support choices were invented. Evidence/procedure: HALLOWEEN_END_TO_END_TEST.md and phase7/halloween-results.json. Physical camera/real ID and owner decisions remain unverified.

# Halloween event specification

## Current Phase 4 status — October 20, 2026

Actual Halloween stays DRAFT/UNCONFIRMED and nonbookable; no date/year/capacity/address/current recipient or BYOB business terms inferred. A distinct halloween-phase4-test fixture is visibly fictional: Oct29–30 test schedule,40places,RM35fee,explicitRM0BYOB alternative, fake private venue and DO NOT PAY destination. It exercised registration, optional inviter, independent reviews, ticket and manual check-in. These values are not launch data.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

Phase 0 · October 19, 2026 · Asia/Kuala_Lumpur. Source: the owner's complete Phase 0 brief reproducing known Google Form screenshot details. Do not submit to or integrate with the original Google Form. No live event or real ticket was created in this audit.

## Confirmed source information

| Item | Source requirement |
| --- | --- |
| Event name | Halloween Party |
| Form title | Halloween Party Info + Registration |
| Main heading | HALLOWEEN NIGHT – OCTOBER 29 🎃 |
| Date shown | October 29; screenshots do not establish a year |
| Category | Private House Party / Halloween |
| Access | Strictly private, invitation only; do not forward without hosts' permission |
| Age | 18+; government ID checked at entrance |
| Location | Not publicly disclosed; hosts send details to confirmed guests closer to event |
| Full name | Required, as stated on IC |
| Age | Required; must be at least 18 |
| Instagram username | Required, registration-private unless separately opted into profile publication |
| Who invited you? | Optional in source; not a substitute for a valid invitation |
| Entry choice | Required; visible options “Entrance Fee of RM35” and “BYOB” |
| BYOB quantities | Minimum four beers OR two sojus OR a bottle |
| Evidence | Required submission of receipt / BYOB proof |
| File limit | One supported file, up to 10 MB |
| Payment method shown | Touch ’n Go eWallet, RM35 when applicable; include full name for identification |
| BYOB alternative evidence | Bottle proof, or contact hosts with planned alcohol; formal website exception requires organizer confirmation |
| Spot confirmation | Required payment and registration verification completed before confirmed guest list/ticket |

The historical QR recipient shown was **ADAM BIN MARZUKI**. This is historical reference information only, not authorization to pay that person today. Never recreate or publish that source QR. A verified organizer must submit a current QR/recipient and approve its use through admin review.

## Configurable development settings

Use October 29, 2026 provisionally in a **draft fictional configuration**. Production publishing requires explicit year confirmation. Store event timezone as Asia/Kuala_Lumpur; do not invent start or end times. Venue/address, coordinates, capacity, price options, proof rules, invitation validation, payment review requirements, refund policy and release timing remain configurable.

Model entry options independently of ticket tiers until the fee relationship is settled. Do not assume BYOB is free or charge RM35 plus BYOB. Permit an organizer to configure mutually exclusive fee/BYOB, combined requirements, or host-approved exceptions after confirmation. Live checkout stays disabled while this is unresolved. BYOB proof is not bank settlement; separate its approval from funds confirmation and door checks.

If the source's host-contact alternative is enabled, record an explicit authorized waiver/review reference; do not silently make the required proof field optional. Confirm supported types (currently app accepts JPG/PNG only); PDF/HEIC support requires a separate safe validation and preview decision. A 10 MB maximum means file bytes and request overhead must be accounted for in application and hosting limits.

## Unconfirmed launch blockers

| Decision | Required resolution |
| --- | --- |
| Year | Confirm October 29, 2026 or correct it |
| Starting / ending time | Exact local times and overnight interpretation |
| Venue / address | Organizer-confirmed address; private disclosure audience and schedule |
| Precise map pin | Omit until supplied and authorized; never invent one |
| Capacity | Total and per-option allocation, reservation expiry rules |
| Fee relationship | Is BYOB an alternative to RM35, or additional? |
| Authorized recipient / QR | Current recipient, authority, admin-approved version |
| Refunds / cancellation | Terms, who returns funds, timelines, contact |
| Invitations | Who can issue/revoke, forwarding rules, expiry, customer identity binding |
| Support | Public support contact and receipt-review operator |
| BYOB review | Host-contact waiver and what bottle/quantity constitutes acceptance |
| Paid launch date | Explicit owner authorization and release gates |

## New MixerMates functionality required

1. An event-scoped authorized booking link behind Coming Soon; no navigation or API escape into unfinished application pages.
2. Private database-backed registration replacing the form. Require full IC-name, age 18+, Instagram, entry option and evidence; inviter stays optional. No public attendee roster.
3. Approved organizer payment QR/recipient configuration with version history and immutable booking snapshot. No QR visible for real payment while review is pending.
4. Required proof upload limited to one supported file ≤10 MB, owner-bound private storage, safe organizer review and retention policy.
5. Independent invitation, payment and BYOB-evidence review. Record who reviewed, when, reasons, funds verification and exceptions. Screenshot alone never confirms funds.
6. Durable state history: pending registration → pending payment review → payment confirmed (when required) → awaiting organizer approval → approved/rejected → ticket issued → checked in. Include cancelled/expired/revoked states and correction paths.
7. Unique private ticket QR only after every applicable approval; customer name, entry option, event date, ticket reference and confirmation status. Public preview/share contains no active credential.
8. Authorized scanning and manual entry fallback, physical ID check, one admission per ticket, explicit BYOB door procedure. Attendance stamps only after check-in.
9. Customer in-app transactional notifications, organizer queues, guest list/export, rejected-proof correction and refund-request records.
10. Fictional organizer/attendees and isolated test tickets that real scanners cannot accept. No money collection during tests.

## Presentation

Premium dark-purple Halloween cover, official MixerMates branding, title, confirmed date, 18+, entry options, invitation-only notice, registration requirements, organizer details and registration action. No fake location. White high-contrast QR area with no artwork over the scanning area. Light/dark presentation must preserve legibility; private details appear only to permitted confirmed guests.

## Existing demo mismatch — do not publish as source truth

`prisma/seed.ts` currently seeds “Halloween House Party”, fictional Mont Kiara address/coordinates, 20:00 start/02:00 end, capacity 80, General Admission and a higher-priced VIP tier. It makes Instagram optional, Invited by required, and adds a required phone field. Checkout accepts an optional 4 MB sample receipt and simulated success. BYOB selection does not change the paid ticket price. These choices are **demo fixtures**, not confirmed organizer decisions. Keep them isolated; migrate the confirmed real event through a draft workflow in a later phase rather than overwriting existing data in Phase 0.

## Acceptance scenarios

- Uninvited, expired/revoked-link and unrelated users cannot register or see private event/location/guest information.
- Missing required name, age, Instagram, choice or proof is rejected server-side; optional inviter can be empty.
- A 17-year-old is rejected; exactly 18 is accepted by age validation, subject to physical ID at entry.
- Zero/multiple files, unsupported content and >10 MB fail; permitted one-file uploads are private to owner and authorized reviewer.
- Ambiguous fee/year/time/QR blocks live checkout. Unreviewed or changed QR stays unavailable until approved.
- Pending proof, unconfirmed funds or unapproved invitation cannot produce an ACTIVE ticket. Retrying approval issues no duplicates.
- Rejected/cancelled/refunded/revoked/suspended-event tickets fail scanning; concurrent valid scans admit exactly once.
- Source venue remains absent until supplied, and location release follows confirmed policy.

Relevant features: O-008–O-020, payment group F, ticketing group D, test group T-O. No event details or schema were changed in Phase 0.

## Phase 2 fixture alignment — October 20, 2026

`prisma/fixtures/halloween-source.json` is the explicit source contract: 18+, full name as on IC and age questions, Instagram required, inviter optional, one proof file up to 10,000,000 bytes, RM35 and source BYOB quantities retained without choosing their relationship. All unconfirmed values remain null/false with a publication block. The isolated alignment script sets the existing Halloween event DRAFT/paused/INVITATION_ONLY/invitations disabled, clears private venue and exact coordinates, corrects required flags and adds IC-name/age questions. Existing legacy dates, inventory tiers and booking history are retained for compatibility and marked historical/unconfirmed in sourceConfiguration; they are not organizer-approved facts. Fresh seeds also remain draft.

The backend supports separate BYOB and payment review and gates exact location by eligibility. The full event form, required answer validation for actual Halloween checkout, 10 MB HTTP upload, actual recipient and live rules remain later work. AUD-04 is PARTIAL, not launch-complete. Halloween publication is explicitly denied by the lifecycle service until a later authorized implementation resolves the missing configuration.

## Phase 3 configured local draft

The isolated fixture is now **Halloween Party**, House Party / Private House Party, Halloween preset, DRAFT/paused, 18+, invitation only, approval required, hidden exact location, private guest list, invitations disabled and no payment destination. Required questions: full name as on IC, age, Instagram, entry option, conditional payment/BYOB proof; inviter optional. RM35 is stored as 3,500 sen. BYOB retains four beers / two sojus / one bottle; its price is null and both entry relationships remain UNCONFIRMED. No optional old demo phone field is promoted to a required source fact.

The seven-step creator can display/edit these definitions; previews mask legacy date/capacity placeholders. No real venue or map pin is retained after guarded alignment. Existing historical tiers/dates are preserved as unconfirmed compatibility values, not sellable allocations. Generic form definitions do not constitute a finished customer proof upload: the one-file 10 MB customer HTTP flow remains Phase 4. No publication or real recipient/identity verification occurred. Tests deny Halloween publication and incomplete entry-price relationships. Fresh isolated preparation applies both guarded Phase 2/3 alignments. Original root database is untouched.
