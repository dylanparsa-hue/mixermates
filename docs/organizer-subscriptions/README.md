# Organizer subscriptions — evidence

28 October 2026. **Local fictional QA passes. No billing or deployment. Owner visual acceptance remains pending.**

Open [the homepage pricing section](http://localhost:3091/explore#organizer-plans). Choose Get Started and activate the selected TEST plan with the account already signed in. Studio shows server-derived plan usage and renewal. If the original Lab customer has no plan yet, the pricing flow activates the selected plan without changing that customer's identity.

## Executed checks

- **359 passing general/regression tests**, zero failures. The suite's one Lab-specific integration parent is intentionally skipped outside the strict Lab environment and is executed separately below. Existing booking, payment review, ticket, admission, event review, privacy and security paths pass.
- **7/7 local subscription tests**: every plan filled to its exact quota; concurrent final-slot approvals, failed checks/transaction rollback, reapproval, cancellation without quota refund, invalid/privileged activation, no-plan/production denial, exact renewal boundary, Malaysia-time month ends/leap years, queued plan changes, missed periods, cancellation/expiry/resume and retained customer identity/bookings.
- **19 browser scenarios**, zero page errors: 14 theme/width layouts (Light/Dark at 320, 390, 430, 768, 1024, 1280 and 1440px); bounded/reduced-motion checks at phone and desktop sizes; three complete ordinary fictional-customer plan journeys; anonymous activation denial.
- Every plan journey uses normal signup and pricing links, retains user ID/email/customer role, activates its organizer capability, publishes through independent review, appears in discovery, displays **1 of its plan limit used** in Studio, cancels/resumes, and retains bookings/tickets/friends/profile routes. Reviewer workspaces preserve and restore the original customer. Cross-origin, foreign user-ID and client verification flags fail closed; admin access remains denied to the customer.
- TypeScript, formatting, SQLite/MySQL schema validation and the optimized production-mode local build pass. No hosted MySQL execution/provider parity is claimed.
- Canonical DB checksum is unchanged. Additive migrations were applied only to disposable local fixtures. Original assets and real-sales/Coming Soon protections remain intact.

Repeated development runs reached the existing Test Lab action rate limit and correctly returned 429. One bucket was reset only in the owned fictional QA database to begin a fresh run; the application rate-limit policy was not changed. An initial HTTP regression invocation lacked its two auxiliary servers; the final recorded run starts them and passes. Final evidence below contains the successful executions.

## Captures and results

- [Dark desktop](pricing-dark-1440.png) · [Light desktop](pricing-light-1440.png)
- [Dark phone](pricing-dark-390.png) · [Light phone](pricing-light-390.png)
- [Starter Studio](studio-starter.png) · [Pro Studio](studio-pro.png) · [Business Studio](studio-business.png)
- [Browser results](browser-results.json) · [Local subscription tests](local-domain-results.txt)
- [Regression results](regression-results.txt) · [Optimized build](build-results.txt) · [Preservation](preservation.json)

Pricing element captures temporarily hide the fixed customer navigation so all three cards can be inspected in one image; actual Studio/interaction checks retain normal navigation. Layout and behavior were inspected in rendered phone, tablet and desktop views.

Reproducible source: `tests/organizer-subscriptions.test.ts` and `scripts/organizer-subscriptions-browser.mjs`. The browser script requires the owned guarded Test Lab and existing private controller storage state, creates fictional accounts/events, and uses only loopback requests. Run through the existing isolated environment wrapper; do not point it at a canonical/hosted database. Preserve rate limits between ordinary runs or prepare a fresh isolated fixture for sustained QA.

Policy and architecture: [subscription handoff](../ORGANIZER_SUBSCRIPTIONS_REPORT.md).
