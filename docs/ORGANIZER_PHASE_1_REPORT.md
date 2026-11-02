# Organizer Phase 1 — local implementation handoff

1 November 2026. Implemented in the existing MixerMates workspace; no stack replacement, database reset or deployment. Owner visual acceptance is separate.

## Reference research

Used the owner's logged-in Chrome session to inspect Ticketmelon's organizer entry/onboarding, profile/business/payout/team settings, new-event details, dates, ticket editor, design/artwork, registration forms/questions, advanced/refund settings, event overview and financial breakdown, analytics, orders/tickets, promos, affiliate inventory, gate-agent setup and scan logs. Official organizer documentation supplemented the live inspection. The complete observed-options matrix, essential/advanced/irrelevant classifications and pre-change MixerMates implemented/partial/missing/broken status are in [TICKETMELON_ORGANIZER_AUDIT.md](TICKETMELON_ORGANIZER_AUDIT.md).

No reference records were created, saved, submitted, published or deleted. No credentials/cookies were extracted; no bank/identity information, invitations, purchases or payouts were submitted. Crop/upload rejection behavior, complete timezone/age option sets, real scanner operation and post-submission publishing/cancellation behavior were not exercised and are explicitly marked unverified. No branding, assets, legal copy or code were copied.

## Implemented

- **One account:** Create Event activates an adult active account's free ORGANIZER capability on the secure backend, then opens the creator. It preserves user ID, role, password, email, verification, tickets, friends and subscription state. No organizer signup, second login or repeated profile form. One `OrganizerIdentity` per user; its name starts from the account name and is editable in Settings. Existing ownership stays attached to the same User rows. Existing organizers enter directly.
- **Automatic links:** readable normalized organizer and event slugs, server uniqueness checks, reserved-name fallbacks and collision suffixes, transaction retry/unique-index race protection. Event slugs also reserve legacy event IDs to avoid ambiguous old links. Slugs stay stable after name/title edits, so old links need no redirect. Saving before naming uses a stable `event` fallback. Public organizer projection excludes private events, drafts, precise locations, contact details and attendees.
- **Three steps:** Event Details → Tickets → Photos, Preview & Submit. The final action is **Submit Event for Review**. Essential fields appear first; optional descriptions, entry conditions, map coordinates, registration questions, sales windows, ticket visibility/order and visual presets remain accessible through compact disclosures.
- **Validation:** Next validates the current/prior steps, displays inline messages and focuses the first invalid control. Future progress is disabled; Enter runs the same validation; step/query parameters cannot select a later screen. Every advance repeats validation on the server. Submission validates saved input plus existing publication, verification, recipient, moderation and sales policies. Paid-readiness feedback shows one issue at the relevant step/field. Going back preserves input and forces forward revalidation. Invalid custom-control errors are associated with their controls for assistive technology.
- **Drafts:** explicit Save Draft on each screen, optimistic version checks and idempotent creation. Private bounded `EventCreatorState` snapshots retain unfinished fields, empty ticket names/quantities and invalid price text without weakening canonical ticket/booking validation. Unfinished snapshots cannot be submitted over an older complete event. Save/reload and saved owner preview recover them. Unsaved navigation is guarded.
- **Tickets:** free RSVP/paid controls, multiple tiers, base price in MYR, finite capacity, maximum/minimum per booking, optional local-zone sales windows, hidden/paused availability and ordering. Hidden definitions stay out of public event/checkout projections; owners retain their inventory view. Paused inventory cannot start checkout. Existing subscribed accounts retain publication quotas, renewal and cancellation rules. Accounts with free creation entitlement may submit free events for independent review; paid publication retains its existing restrictions.
- **Artwork:** independent main poster and optional cover banner; previews, replacement, gallery and existing artwork choices. Upload checks enforce size, MIME/signature, bounded decoding and ownership. Existing poster-only events retain the poster fallback. Missing supplied-asset paths are rejected. No new crop editor is represented as supported.
- **Studio:** My Events / Payments / Scanner / Settings, with contextual Overview, Edit, Tickets, Guests, Payment Review, Attendance, Basic Analytics, Event Operations and Staff. Actual permitted counts replace invented figures. Existing refund, support, recipient, security and operations services remain available through secondary tools. Discount promo-code creation is not falsely represented by the pre-existing event-promotion service.

Browser-local timezone defaults are editable. Private precise addresses/joining links remain protected. Online events can use the existing “Online” city/venue pattern and protected joining-link field; there is no new streaming/session service. Historical categories/themes and legacy long descriptions receive compatibility defaults when opened in the new form.

## Data and policy preservation

Additive schemas/migrations only: `OrganizerIdentity`, `EventCreatorState` and `Event.coverImage`, with matching SQLite/MySQL definitions. The SQLite migration rehearsal retained all 46 prior tables and 83 fictional rows, including the booking and ticket; prior-column row fingerprints, integrity and foreign keys passed. No canonical or production database was migrated. MySQL Prisma schema validation passed; the new MySQL migration was not executed against a database in this phase.

A private pre-change source snapshot is retained under `/Users/parsa/.codex/tmp/mixermates-organizer-phase1-20261101/`. All 65 recorded original public-asset/database hashes match. Actual Halloween remains protected. Coming Soon, the public demo scope, financial verification, admission and real-sales guards remain in force. Real billing/payments/sales are disabled. No hosting/DNS/production-environment changes, upload, tunnel, auto-deploy push, external message or production access occurred. Optimized build output exists only in the isolated local regression workspace; no upload/release archive was prepared.

## Verification

| Check | Result |
|---|---|
| Full automated suite, including separate Coming Soon access fixture | **380 passed, 0 failed**; one guarded subscription group skipped outside the Lab |
| Guarded subscription suite, executed separately in the verified Lab | **7 passed, 0 failed, 0 skipped**, including all three plan quotas, contention, renewal/cancellation, free entitlement and paid-plan restrictions |
| New creator coverage within the full suite | **15 passed**: identity, concurrency, slug normalization/collisions, incomplete drafts, transitions, uploads, tiers, private/online drafts, submission/review, old records, hidden definitions and unauthorized/stale requests |
| Existing Playwright suite, desktop and mobile | **10 passed**; creator expectations updated for the new labels/disclosure/state presentation |
| Fresh customer entry | Passed: normal fictional signup, click Create Event, same user/role, one organizer identity, no subscription or separate organizer form |
| New creator browser journey | Passed: customer identity → free access → invalid/valid steps → paid/free controls → save/reopen → poster/banner upload → preview → submit → independent admin approval → event/inventory → permissible edit |
| Additional format journey | **5 checks passed**: Enter validation; private paid/free multi-tier submission; approved fictional recipient/admin review; uninvited-user denial; owner guest/scanner controls |
| Accessibility recovery | **5 checks passed**: price/sale-date error associations, focus, visible mobile recovery field, labels. No screen-reader session performed |
| Rendered creator matrix | **26 captures**: the 14 creator/error/inventory captures plus 12 My Events/Settings/Tickets captures at 390/1440px in Light/Dark; no overflow or page errors |
| TypeScript / optimized local Next.js build | Passed |
| Design detector / independent finish review | Detector `[]`; error-association fix scored **resolved**, disposition **ship** for that fix. This is not owner acceptance |
| Protected source data/assets and isolated migration | Passed; [evidence](organizer-phase1/source-preservation.json), [migration fingerprints](organizer-phase1/migration-results.json) |

Evidence and scripts: [browser journey](organizer-phase1/browser-results.json), [format results](organizer-phase1/format-results.json), [accessibility](organizer-phase1/accessibility-results.json), [fresh account entry](organizer-phase1/account-entry-results.json), [Studio matrix](organizer-phase1/studio-results.json), [design review](organizer-phase1/design-review.md), [design-system check](organizer-phase1/design-system-check.md), `tests/organizer-creator.test.ts`, `scripts/organizer-phase1-browser.mts`, `scripts/organizer-phase1-formats.mts`, `scripts/organizer-phase1-accessibility.mts`.

The initial regression run identified missing local harness flags/markers; those were corrected in isolated copies and final runs passed. An existing browser test exposed the short-description counter changing its accessible name; the control now has a stable name. Tests were not weakened to accept failed flows. The historical no-plan publication assertion was updated specifically for the requested free-event entitlement; paid-plan denial and subscribed quotas remain tested.

## Local preview

Open **http://localhost:3091/**, then Create Event or Organizer Studio. This is the guarded fictional Test Lab, bound only to loopback. The owner’s November 1 follow-up removes the local access-code gate: opening the site automatically starts the fictional customer session. No code or password is required. Use the Workspace selector for organizer/admin testing. See `UI_TEST_LAB_SECURITY.md` and `local-code-free-entry/results.json`. It runs from an isolated copy with fictional data; do not start the root workspace against its canonical database to try these migrations.

Restart if needed: `python3 /Users/parsa/.codex/tmp/mixermates-correction-20261101/preview/.local/start-test-lab.py`.

## Deferred / Phase 2

The new 5% fee system is **not implemented in Phase 1**. Existing base tier prices and financial services are unchanged; `lib/rules.ts` (`feeFor`), payment/booking services and the price area in the creator are the integration points for separately specified Phase 2 quote/disclosure/settlement work. No fee-absorption or payout behavior was invented.

Multiple dates/session eligibility need a dedicated event-session/inventory model; the existing single-range backend has none. Arbitrary rich HTML/video embeds, cropping, buyer discount promo codes, ticket sections/images, seat maps, affiliates, analytics tracking and tax-invoice workflows are deferred because they require capabilities beyond the current services or a separate scope. Existing bounded text, supporting photos, invitations and operating reports remain usable. No placeholder controls imply these deferred features work.

No deployment or Phase 2 started. Any future release needs fresh owner authorization and the applicable acceptance process.

## Follow-up: validate paid requirements before preview

The owner’s November 1 report exposed a validation gap: paid verification/recipient/policy requirements were checked only at final submit, and verification was attached to the wrong field. Fixed locally with shared client/server Tickets-step checks, visible actionable requirements, separate verification feedback, current approval refresh and a reachable verification form. Unresolved advanced entry options also block before preview. The full corrected regression passes (384 pass, 0 fail, 1 gated skip); mobile/desktop Light/Dark journeys and the isolated build pass. Existing unfinished drafts remain saved. See [ticket-step-validation/README.md](ticket-step-validation/README.md) for recovery instructions, limits and current evidence; this supersedes the earlier accessibility check that expected a late return from Preview.
