# Event readiness review

October 27, 2026 · Asia/Kuala_Lumpur · localhost only

Existing Phase7 readiness and sales architecture are preserved. Event operations shows six categories: event details, organizer, payments, registration, entrance and operations. Detail checks use TECHNICALLY_VERIFIED / INCOMPLETE; human obligations use NEEDS_HUMAN_VERIFICATION, BLOCKED_OWNER_DECISION and BLOCKED_EXTERNAL_SERVICE. The historical human.status=NEEDS_VERIFICATION is retained for existing API consumers; blockerStatus provides the finer distinction. No green combined launch score or sales-bypass button was added.

Technical checks cover stored title/future schedule/configuration, venue fields, capacity/tiers, organizer account eligibility, current approved recipient/QR, instructions, registration/invitation rules, stored ID policy/staff permission, versioned refund policy and pending changes/publication prerequisites. Presence of a venue or VERIFIED test account is not actual venue authority/identity. Separate category copy explicitly distinguishes configured values from owner approval.

Required human/owner/external work remains: responsible organizer/contact and event legitimacy, genuine recipient/QR authority, finance and approval reviewers, fee/BYOB terms, support/cancellation/refund policy, reservation/review deadlines, physical phones/ID/guest-list/network procedure, venue/legal responsibility, customer communication and actual delivery provider. Fictional approvals are labelled testOnly and cannot supply genuine identity/recipient verification.

readiness.salesAuthorized is always false. Site access and independent ticket-sales fail-closed controls remain separate. Actual halloween remains DRAFT, UNCONFIRMED and sales paused; its real year/time/venue/capacity/recipient/QR/fee-BYOB/refund/support facts were not invented. No provider, recurring job or real sender was connected.
