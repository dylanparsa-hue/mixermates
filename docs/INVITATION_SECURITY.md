# Private invitation security

## Current Phase 4 status — October 20, 2026

Scoped customer adapter reuses existing identity-bound grants, sessions and invite service. Fragment token is stripped from URL; login retains intended event/owned booking. Private signup cannot claim another identity; only approved public test event permits adult signup. Owner/admin can generate an invitation for an existing username in Booking reviews. Customer APIs have independent origin, session, object-scope, no-store and bounded upload controls. Review routes remain restricted by event finance/registration permissions even while sales are disabled.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

October 20, 2026. This is a tested local backend foundation; customer entry UI and deployment-specific Coming Soon exception remain later work.

- Issuer must be the active event owner or admin. Event must be private, invitationsEnabled and in an allowed state. No arbitrary public invitation creation.
- Create requires an existing active invitee account ID. Optional normalized email must match that account. Email is not claimed verified; email-only bearer grants are refused by the input schema. Organizer approval of the account's identity is the conservative provisional policy until verified-email delivery and the real invitation policy are approved.
- Generate 32 random bytes; store SHA-256 token hash only. Return the raw token once to the authenticated issuer. No public listing, ordinary log or audit stores the raw token. HTTPS/private delivery is still a release requirement.
- Explicit expiry is required, within 90 days; server binds event, inviter, invitee, optional email, status, usage limit/count and revocation time. Default one use. This implementation grants once per invitation/account even if a larger usageLimit was requested; group/forwardable invitations are unsupported.
- Redeemer must be signed in as the bound active account. Exact event, active/unrevoked/unexpired invitation, invitationsEnabled, active/unpaused/unended event are checked in a transaction. A single conditional use claim plus unique invitation/user grant prevents duplicate consumption. Valid same-account retries return the original grant.
- Revocation invalidates the invitation and all associated grants immediately. Expired/revoked/forwarded/wrong-event/unknown tokens fail safely. Revocation never silently cancels a booking or changes confirmed payment history.
- Grant permits the scoped private event and registration attempt; it is separate from payment, registration approval and admission. Pending/granted accounts never gain exact venue coordinates/address. Confirmed eligible registration controls location release, with explicit owner/admin/staff-location exceptions.
- Anonymous/private search, map, media and attendance remain denied or redacted. Session role/client query flags cannot manufacture a grant.

POST `/api/invitations`, `/api/invitations/redeem`, `/api/invitations/revoke` use server authorization and database rate buckets. Coming Soon continues to block ordinary customer entry and grant redemption; full_platform isolated rehearsal exercises the real grant flow. No public invitation emails were sent. The owner must still approve actual issuer/identity/expiry/reuse/forwarding policy before enabling any live links (DEC-09/17).
