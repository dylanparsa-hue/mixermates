# Organizer event management — Phase 3

October 20, 2026. Local fictional data only. Preview: http://localhost:3001. Public visitors remain on Coming Soon; real ticket sales remain disabled.

## Sign in and scope

Use `/organizer/login` with an existing authorized local organizer/staff account; administrator sign-in stays `/admin/login`. Ordinary attendees cannot use these routes to open the restricted preview. A scanner-only staff account does not gain organizer payment/event creation powers. Existing authentication and session revocation still apply. Keep the private local admin file and environment out of shared archives.

## Create, save and reopen

Open Organizer studio → Create event. The seven numbered steps are Basics, Date & location, Access & rules, Tickets, Registration, Visual style, Review. Save draft accepts incomplete work; it does not mean the event is ready to publish. Open My events → Edit & manage to continue. Refresh reads persisted database state; stale concurrent edits are rejected rather than silently overwriting newer changes.

1. Add a name/category, short/full description, built-in or organizer-owned poster and optional supporting images. PNG/JPG/WebP artwork is limited to 4 MB.
2. Set the local start and end, valid timezone, city, venue/address, optional coordinates and location visibility. Overnight events need an end on the following date. Nonexistent local clock times are rejected. Review shows both dates/times and timezone.
3. Choose public/private/invitation-only access, approval, minimum age, ID check, total capacity and customer policies. Hidden/private location stays excluded from unauthorized projections.
4. Add General Admission, Early Bird, VIP, Free RSVP or custom tiers. MYR prices convert to integer sen; negatives/excess decimal precision fail. Configure finite quantities, optional sales windows, availability and minimum/maximum quantities per order. Tier totals cannot exceed event capacity. Select an owned approved active payment destination for a paid event.
5. Configure visible text/long-text/email/telephone/number/select/radio/checkbox/file/consent questions. Mark required/optional, supply choice options, or hide a field (hidden fields cannot also be required). Define entry options with unique keys, explicit price/relationship and conditional questions. This configures requirements; the Phase 4 customer proof/checkout flow is not implemented here.
6. Select House Party, Nightclub, EDM, House Music, Techno, Halloween, Concert or Festival preset.
7. Review persisted details, save, open the authenticated Desktop/Mobile preview, then submit for admin review when all readiness checks pass. Preview has no active purchase action.

## Publication and edits

Submission validates poster, future schedule, venue/city, capacity/tiers, sale windows and applicable organizer/payment/policy/entry-option requirements. Pending review locks editing. Admin Event setup can request changes/reject with reasons (returns a draft), approve, or suspend with reasons. Decisions write audit/notification records. Publication approval never turns on sales.

Editing a published event with no bookings returns it to a paused draft for review. Existing bookings lock financial, tier, schedule, location, access and policy/registration contract changes; safe descriptive edits preserve published status. Existing booking totals and recipient snapshots remain immutable. Owner cancellation uses the shared lifecycle service: closes sales, revokes entry and records refund-pending/notices; it never transfers money.

## Private organizer payment settings

Organizer studio → Payment methods supports Touch ’n Go, DuitNow QR and Bank QR. Enter the destination label, recipient name, optional recipient/account reference, display name, instructions and internal organizer reference. Upload a private PNG/JPG/WebP QR up to 4 MB. Do not upload real payment details into a fictional rehearsal.

Submission creates PENDING_REVIEW. Admin Event setup sees the actual private QR and recipient. Approval requires an independent recipient check and a documented procedure; local approval must explicitly describe the fictional sample and makes no real verification claim. Rejection/request correction needs a reason. The owner submits a new version to correct rejected details.

Replacement retains earlier versions and creates the next pending number. An existing approved active version stays available for event configuration while its replacement waits. Only an approved version can be activated; disabled destinations cannot be assigned to new bookings. Owner/admin default selection requires an approved active owned destination. Owner or admin can disable with an audit reason; admin controls activation of an approved version. Past booking snapshots stay on their original version.

The owner screen displays version, recipient, status and review notes. Full reviewer/timestamp actions remain in stored audit records/admin Audit log; this screen is not a consolidated review timeline. Private QR URLs require owner/admin authentication and are never public assets. No upload proves receipt of funds.

## Organizer verification and staff

Verification requests remain UNVERIFIED/PENDING until an independent admin review. Phase 3 review is permitted only in an explicitly isolated test environment with a fictional-data confirmation and recorded notes. No real ID upload, real identity certification or automatic verified claim is added. Existing demo verified accounts remain fictional fixtures.

Staff tab assigns an existing active account username to one owned event, with explicit view/check-in/manage flags. Revoke removes that event assignment. Permission checks happen on every protected request; assignment does not grant platform administration or control of another organizer's payments. Guest list, registration, scanner, analytics and other incumbent tools remain available according to their existing permissions. Actual staff identity, physical camera and offline admission need a later operational rehearsal.

## Halloween draft

Open Halloween Party in My events. It remains DRAFT/UNCONFIRMED, invitation only, 18+, hidden location, private guest list and sales paused. Required IC-name/age/Instagram/entry choice and conditional proof definitions exist; inviter is optional. RM35 and source BYOB quantities are preserved, while their relationship and BYOB price remain unresolved. Year/time/capacity/actual venue/recipient/QR/refunds/support are not invented. Legacy dates/tiers are historical placeholders, hidden as unconfirmed in previews. Lifecycle publication is deliberately blocked.

## Next boundary

Phase 4 will implement authorized customer entry, tier/entry selection, approved organizer instructions, private receipt upload and independent manual approval using existing eligibility services. It has not started. See PHASE_3_REPORT.md, PHASE_3_CHECKLIST.md and LOCAL_DEVELOPMENT.md. Do not deploy this workspace or modify the frozen Phase 1 ZIP.
