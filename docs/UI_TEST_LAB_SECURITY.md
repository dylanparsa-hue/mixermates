# Critical correction additions — 28 October 2026

The existing fail-closed guard remains unchanged. `activateLabOrganizer` additionally requires the authenticated controller and fixed adult fictional customer, accepts only the TEST plan, and upserts only that identity's ORGANIZER capability. It changes no role, identity verification, recipient, customer records or billing state; retries are idempotent. Normal customer operation reads explicitly retain customer scope after an upgrade.

The three workspace destinations are a presentation layer over protected server sessions. Personal Organizer reuses Customer; Admin and sensitive review tools resolve distinct existing fictional actors with truthful audit attribution. Client role flags cannot grant production authority. Normal local event approval can authorize only independently reviewed, test-only events owned by the fixed customer/fixture host after the complete environment guard. It does not approve identity or recipients. Free fictional RSVP follows the existing free-publication rule; paid and mixed-price events still require verified organizers and approved payment instructions.

The private fixture shortcut issues a real persisted, account-bound invitation. Its credential travels in the existing fragment flow and is redeemed by the normal customer service. No private access rule is bypassed. The normal unauthenticated entry redirects to the compact sign-in only after the full owned disposable environment/database/request checks succeed. Production bypasses that branch, and Lab routes remain 404 even with the enable flag present.

Evidence: `ui-fixes/entry-hover-results.json`, `journey-results.json`, `refund-results.json`, `signup-results.json`, `scenario-results.json`, `browser-results.json`, `optimized-results.json` and `preservation-results.json`. No schema migration or real provider integration was added. Prior security documentation below remains relevant to the retained developer tools.

# Local Test Lab security

This is a disposable development adapter, not a sales-release or production authentication feature. Canonical `prisma/dev.db`, production and the original Halloween configuration are untouched. No schema migration or shared domain approval/inventory/admission rule was changed.

## Fail-closed environment

`lib/test-lab-guard.ts` requires all of the following together:

- Exact `NODE_ENV=development` and `MIXERMATES_TEST_LAB=enabled`, development release scope and explicit isolated/customer-test flags.
- The owned `~/.codex/tmp/mixermates-correction-YYYYMMDD/preview` workspace and its exact contained SQLite `prisma/audit.db`; canonical paths, other database URLs and DB_* overrides fail.
- Coming Soon, disabled ticket sales, legacy demo switching/booking false and Hostinger bootstrap/seed false.
- A loopback HTTP origin with an explicit port. Request Host/URL/port must match loopback; public forwarded hosts/IPs and forwarded headers fail. Mutations require the exact configured Origin. The supplied launcher binds 127.0.0.1.
- No configured known banking/payment, SMTP/email, SMS, transactional-provider or cloud-provider environment keys.
- A private filesystem marker bound to the resolved workspace/database, plus a matching SHA-256 nonce marker in the database. Missing, mismatched or symlinked/out-of-workspace database markers fail.
- All stored events/bookings/tickets/recipient versions remain test-only, and account emails stay in the fictional fixture domains. Fresh preparation never imports the canonical database, .env, uploads or credentials.

A configured variable alone is insufficient. Production/runtime builds cannot enter the Lab branches: both page and API return 404. The optimized local runtime was checked explicitly. There is no separately registered production Test Lab route; the development adapter is conditionally dispatched inside existing catch-all routing.

## Automatic local entry, separate actors

The owner’s November 1, 2026 correction removes the access-code gate. Opening a known page in the verified disposable localhost workspace automatically creates a fictional customer session through a development-only route handler. No code, password, or entry button is required. The full environment, request, filesystem-marker and fictional-data checks above still run first. The controller token remains random, hashed in the existing session table, HttpOnly and SameSite=Strict with an eight-hour expiry. Existing valid controller sessions are reused so reloads do not reset the selected persona. The entry handler rejects cross-site browser requests and external return URLs; the compatibility POST login endpoint accepts an empty body under the existing exact-Origin guard. New preparation no longer generates or stores an entry code. Production and other environments do not dispatch either endpoint.

Persona selection accepts only the fixed allowlist. It resolves a distinct persisted fictional user, verifies that user's active server role, rotates the normal application session and deletes the previous persona token. The client dropdown carries no authority. Every booking, review, event decision, message, refund and admission runs through the existing services as that active user, with its existing permissions and audit attribution. The controller itself is an ordinary ATTENDEE and performs no event approval.

Customer, Organizer, Administrator, Finance Reviewer, Entrance Staff and a separate consenting Community Friend have different user IDs. Finance receives only event-scoped payment review; entrance receives guest lookup/check-in, without financial review. Public signup still creates ATTENDEE. It cannot select a role or become a real administrator. The local signup form accepts fictional @example.test email only. Recovery mailbox access is limited to separately created ordinary fictional signup customers; it does not disclose controller or privileged-persona credentials.

State reads omit finance amounts/evidence for entrance and omit the customer's booking entirely for the Community Friend; ordinary signup customers read their own booking. Existing APIs continue to check ownership, active assignments, invitation grants, media privacy and server eligibility independently.

## Fictional booking authorization

The real-sales config still resolves to disabled. Legacy demo sale actions are denied inside the Lab. An organizer creates a draft with the normal event-draft service and submits it normally. A separate fictional administrator explicitly approves it through the lifecycle service. Only that reviewed, test-only, lab-organizer-owned event receives the existing `FICTIONAL_APPROVED` customer-workflow marker. The existing domain uses `origin=REAL` to distinguish its approval-driven workflow from old demo shortcuts; this is not live-sales approval. Test-only and local-environment conditions remain mandatory. Original Halloween cannot be selected or authorized by the adapter.

Reservation, quantities, price, inventory/expiry, required answers, private evidence, independent funds confirmation, registration approval, issuance and entrance use the original services. Sample evidence is a private fictional image. Submission does not confirm money or issue a ticket. The finance actor must explicitly attest fictional incoming funds; the organizer separately approves registration. Door admission repeats authoritative eligibility and ID checks; duplicate admission is rejected.

Refund approval, fictional transfer reporting and customer acknowledgement remain separate. Reschedules use request/independent review and preserve original terms. Cancellation uses the existing impact-confirmation interface and lifecycle service. No money, external email or SMS moves. In-app updates and password-recovery JSON stay local.

## Evidence and limits

Three new counted Node tests cover guard combinations and discovery dates. `ui-correction/lab-security-results.json` records eight grouped HTTP/session checks, including missing/mismatched database marker, root-cookie denial, distinct actors, old-token revocation, forged roles/origin/proxy claims, community scope and original sales/Halloween protection. `performance-optimized.json` records production-runtime 404s. The unchanged domain regression baseline passes.

No hosted SQL schema or contract was changed. The Lab deliberately refuses MySQL/MariaDB and all production connection strings; new Lab workflows were tested only on the owned fictional SQLite database. Existing MySQL/MariaDB integration suites were not rerun for this SQLite-only adapter. Physical camera/ID/door and real-world operating acceptance remain outside this local software rehearsal.

## November 1 code-free entry verification

Fresh desktop (1440px) and mobile (390px) contexts open the homepage and creator without credentials, switch to the fictional administrator, retain that actor on reload, and automatically recover from cleared cookies while preserving the requested route/query. Cross-origin entry, sessionless role selection and external redirects remain rejected. Evidence: `local-code-free-entry/results.json` and two rendered screenshots. Earlier one-code entry evidence above is historical.

## November 2 local simulator extension

The owner-authorized quick purchase path is now available through the normal site, guarded by an additional MIXERMATES_PAYMENT_SIMULATOR opt-in and the full existing Lab request/environment/marker/data checks. It creates actual fictional provider, booking, ticket, refund and admission records. Manual QR review remains separate. See [simulator security](PAYMENT_SIMULATOR_SECURITY.md) and [owner instructions and results](PAYMENT_SIMULATOR_REPORT.md). No production or Phase 2 authority follows.
