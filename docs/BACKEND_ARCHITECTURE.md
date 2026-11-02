# Phase 2 backend architecture

## Current Phase 4 status — October 20, 2026

lib/customer-api.ts is a scoped adapter over existing auth, invitations, booking-domain, payment-foundation, staff-permissions and services/checkIn. app/api/customer/[...path] does not replace the original platform API. New customer pages use a narrowly isolated fictional exception; guarded production release refuses it. Shared issuer/stock/audit engines remain authoritative. Standalone server expiry invokes existing transactional service; no browser-dependent job.

**No production deployment was performed.** Current acceptance: [Phase 4 report](PHASE_4_REPORT.md). Earlier entries below remain historical where they describe an older phase.

October 20, 2026. Existing Next 16.4.2 / React / Prisma 6.19 / custom bcrypt-and-cookie stack retained. Backend-only work; Coming Soon design and release ZIP are frozen. No production deployment was performed.

## Boundaries

`app/api/[...path]/route.ts` remains the HTTP adapter. It authenticates, checks site/sales policy and origin, validates input, applies shared database throttles, projects authorized data and calls domain services. Existing page/UI routes are retained. Real checkout is disabled regardless of requested sales-mode flags.

| Module | Responsibility |
| --- | --- |
| lib/auth.ts; lib/security.ts | Hashed sessions, current active/security-version checks, registration validation, account changes, rate buckets, single-use recovery |
| lib/domain-core.ts | Serializable transactions with bounded conflict retries, fresh actor/staff permission, event state fence, structured audit, transactional in-app notification |
| lib/invitations.ts | Account-bound secret invitation issuance/redemption, expiry, use count and revocation |
| lib/booking-domain.ts | Inventory holds/releases, canonical state transitions, registration review, event lifecycle, ticket eligibility/issuance/revocation |
| lib/payment-foundation.ts | Recipient versions/admin review, evidence association, independent funds review and separate BYOB review |
| lib/staff-permissions.ts | Event-scoped least-privilege assignments and session invalidation |
| lib/event-access.ts; lib/media-access.ts | Private event, location and image permissions |
| lib/services.ts | Existing explicit isolated demo booking/refund flows; common eligibility and transaction-safe check-in |

## Authorization

Roles remain ATTENDEE, ORGANIZER, STAFF and ADMIN. Active `UserCapability` rows allow organizer/staff functions without replacing an attendee role. An EVENT_STAFF capability permits the narrow preview; each actual action checks a fresh active `EventStaff` row for that event. Guest access, scanning, finance review, registration approval and private-location visibility are independent booleans. Assignment defaults in the new management service are false; preexisting assignments retain their historical scanner/guest defaults. Owning an event or being admin grants the named event action. Creation still requires organizer capability. A scanner never inherits finance authority from role or global staff capability.

`securityVersion` on User/Session invalidates stale sessions after supported password, role, capability, suspension and staff-assignment changes; those services also delete existing sessions. Reads use current user/assignment state, rather than trusting client role flags. Account deactivation is audited transactionally. Legacy direct database edits are not a supported administrative workflow.

## Concurrency and persistence

Serializable Prisma transactions retry known contention/uniqueness/timeout errors at most four times after the initial attempt. All attempts roll back on failure. Event version/status fences serialize booking, review, issuance and check-in with admin event-state writes. Unique booking idempotency, ticket sequence/token and check-in constraints provide a second barrier. Capacity is claimed at both event and tier levels; inventory-held compare-and-set releases it once. Expiry is an explicit reusable service; a scheduled worker is not enabled in Phase 2.

Audits and required in-app notices share the domain transaction. Notification dedupe keys make replay safe; deliveryChannel=IN_APP and deliveryStatus=AVAILABLE make no email-delivery claim. Audit records include actor role, entity/event, previous/new state and correlation identifier. Older audit rows are preserved as LEGACY. The database does not provide tamper-proof/WORM audit storage; production retention and monitoring remain future operations work.

## Security and privacy

Auth/account and sensitive management endpoints use hashed database fixed-window buckets. Upload validation still uses the existing 4 MB HTTP limit; the foundation evidence service supports a single stored private JPG/PNG up to 10 MB (10,000,000 bytes). Customer-facing 10 MB upload work is deliberately not complete. Public media never returns private receipt/QR files. Receipt access is booking-owner or event finance scope. Staff organizer responses omit financial fields and private location unless individually authorized. Private event attendance is excluded from public profile and attendee discovery even when social attendance flags are public.

Origin is required outside explicitly isolated local testing and hostile origins are rejected. Proxy addresses are trusted only in the isolated environment or with explicit AUTH_TRUST_PROXY=true; default production fallback shares a conservative global IP bucket. Hosting must verify header stripping/trust before enabling that setting. Fixed windows allow boundary bursts and are not a distributed DDoS service. MySQL multi-process behavior and actual HTTPS/cookie/CDN behavior are not certified locally.

## Local evidence

`tests/phase2.test.ts` covers the new domain/API boundaries. Existing 116 baseline cases remain in the 140-test accepted suite, with private-booking fixtures now obtaining real persisted grants and login tests passing only actual credential fields. SQLite runs in copied/disposable databases; original `prisma/dev.db` is untouched. See `phase2/CHECKLIST.md`, `PHASE_2_SECURITY_TESTS.md` and `PHASE_2_REPORT.md` for exact limits.
