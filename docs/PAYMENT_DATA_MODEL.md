# Organizer-direct payment foundation

## Current Phase 4 status — October 20, 2026

No new model/second payment engine. Booking.reviewHold freezes on-time proof stock for manual decision; PaymentReview.receivedAmount and recipientVersionId retain financial review evidence. Booking recipient JSON and existing version FK remain immutable snapshots. Receipts are private blobs; 10 MB customer evidence bound is separate from4MB organizer QR. Funds commit before issuer retry; upload never confirms money. SVG private/safe exports are owner-scoped; safe preview removes identity, address and credential.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

October 20, 2026. No payment provider, checkout UI, real fund receipt, settlement, escrow or automatic refund is implemented or claimed in Phase 2. All REAL-origin model rehearsals use testOnly=true in isolated SQLite. The reserve service refuses other environments.

| Record | Meaning |
| --- | --- |
| PaymentDestination | Organizer-owned DUITNOW / TOUCH_N_GO / BANK_QR destination, label, review state and active approved version |
| PaymentRecipientVersion | Immutable recipient name/reference/private QR asset and version number, admin reviewer/time and optional disable marker |
| Booking.recipientVersionId / recipientSnapshot | Instructions bound at reservation; later approved QR replacement cannot rewrite historical customer instructions |
| Payment | Required amount in integer sen, workflow state, origin and confirmation time; no custody claim |
| PaymentEvidence | Booking payment, privately owned receipt asset, submitter, expected amount and recipient version; unique asset association per payment; PAYMENT or BYOB kind |
| PaymentReview | Authorized independent reviewer, evidence, decision, explicit fundsVerified flag, notes and time |

Only an eligible organizer can submit a private owned supported QR. Independent admin approval activates its immutable version. A pending replacement leaves the old approved active version in place. A new paid reservation requires the active approved, non-disabled recipient to belong to that event's organizer and snapshots it. Historical instructions stay fixed when a replacement is approved. Approval of a historical version remains evidence of what was shown; disabling future use does not invent a retroactive refund.

Evidence submission moves payment to PROOF_SUBMITTED and stores an in-app notice. It never confirms funds. A finance-authorized event owner/admin/staff reviewer must independently assert the exact received amount and fundsVerified=true. Review rejects customer self-approval, scanner-only staff, wrong evidence/recipient/amount and expired/inactive bookings/events. Confirmation records who asserted funds receipt; the platform cannot independently prove a bank balance without an integration. The operator and real procedures remain owner decisions.

Registration approval is independent. Tickets issue only when all required payment, evidence, registration and BYOB conditions pass. BYOB evidence does not change payment state. No fee/BYOB relationship is inferred from Halloween's ambiguous source. Cancellation after confirmation records REFUND_PENDING; no external money moves and no fake completed refund is created. Existing demo refunds/payouts remain explicitly simulated and cannot handle REAL-model payments.

The foundation validates one private stored PNG/JPEG evidence file up to 10 MB (10,000,000 bytes); HTTP upload still accepts 4,000,000 bytes with signature validation and is not advertised as a finished 10 MB customer upload. No public destination/evidence/review checkout endpoints were added. Later authorized phases must build those adapters/UI, operational review, transfer deduplication, refund proof, approved retention rules and production acceptance. Files are not exposed through public media; finance/customer authorization remains required for receipt access.

## Phase 3 organizer configuration extension

No competing payment/event models were added. PaymentDestination adds isDefault. PaymentRecipientVersion adds instructions, displayName, organizerReference, reviewNotes, verificationProcedure and testOnly. Existing version, QR asset, recipient reference/name, approvedById/approvedAt, disabledAt and audit rows are reused. Event points to a destination; reservations keep their immutable recipientVersionId/snapshot. Replacement creates a pending numbered version and retains the previously approved active version until independent approval changes it. Retry with the same initial asset/metadata returns the existing submission.

Owner submits PNG/JPG/WebP private images up to 4,000,000 bytes through the authenticated upload endpoint (magic-header check); private version image endpoint allows only owner/admin. QR review approval requires explicit independent check and documented procedure; reject/correction records a reason and requires a new submission version. Admin cannot approve their own destination. Disable blocks new use, preserves history and existing booking snapshot; activation only accepts a reviewed approved version. Default/event assignment is owner-scoped and requires an approved non-disabled active version. Actions are audited with actor/state/time; version review notes/procedure are not overwritten by replacement.

Review timestamp comes from approvedAt for approval and immutable audit createdAt for every decision. The present owner UI shows versions/status/recipient/notes; it is not a comprehensive timestamp/reviewer audit timeline (F-014 remains partial). No real recipient ownership or funds has been verified. Payment QR configuration never issues tickets, confirms uploaded proof or enables live HTTP bookings. Future customer disclosure remains defined in lib/event-config.ts; Phase 4 must present approved instructions and verify independent payment/registration gates.
