# Verification record

Verified locally on October 17, 2026 (Malaysia time).

## Automated checks

- TypeScript `tsc --noEmit`: passed.
- Next.js optimized production build: passed, including App Router/API compilation and production type checking.
- Database migration and idempotent seed: passed.
- Node test runner via `tsx --test tests/*.test.ts`: 26 tests passed in the latest completed full run, including the nested integration cases.

The HTTP suite uses the running app and real SQLite records, uniquely names its fixtures, and removes those fixtures afterward. It covers signup, login/logout, hashed passwords, public discovery/filtering, origin protection, cross-user access denial, organizer ownership, event edit locking, adult restrictions, failed payment behavior, persistent/idempotent bookings, approval, QR generation, private venue disclosure, simultaneous scan rejection, verified attendance/badges, capacity, review/refund stock release, private attendance consent, friend requests/messaging/blocking, promotion approval, simulated payout idempotency/admin review, notifications and saves.

## Connected-browser checks

- Desktop navigation and discovery rendered without a static mock layer.
- Real Halloween registration form → Pending review → organizer approval → issued ticket.
- Manual test scanner with a real issued token → check-in success → second scan rejected with “Already checked in.”
- Attendee Tickets → Attended → checked-in digital QR ticket.
- Profile → verified Halloween Passport memory; first-attendance badge unlocked; attendance remained private.
- Interactive map rendered Kuala Lumpur-area streets and event markers. Selecting a private-event marker opened an approximate-area preview.
- An initial CARTO endpoint produced key-required tiles during visual inspection. It was replaced with the verified keyless OpenFreeMap dark style; the rendered map was rechecked.
- Mobile 390 × 844 homepage: navigation, search, hero and categories rendered; document width equaled viewport width (390 px), with no horizontal overflow.
- The complete six-step event wizard created and saved a free-event draft with a custom registration question. The draft appeared in Organizer studio.
- Desktop and mobile screenshots are in `docs/screenshots/`.

## Verification limits

No real money, email delivery, push delivery, production hosting, physical camera device, identity provider or real-world venue entry was used. Camera scanning is wired to the shared server validation path; manual QR token validation and duplicate protection were exercised. Optional Playwright specs are supplied for repeatable desktop/mobile discovery tests, but this session’s UI verification used the connected browser rather than that standalone runner. See README and architecture notes for production work remaining.


## Reference profile update

The initial profile composition was verified against the first October 17 reference. The later navy/blue/lime refresh below supersedes its original red palette. The profile uses a shared immersive composition for own/public profiles, a generated editorial cover, centered portrait, floating achievement stickers, real follower/following/club counts, About/website pills, mutual previews and connected Friends/Message controls. Phone layouts use the profile’s own close/menu controls instead of duplicate app navigation.

Verified About, follower empty states, settings save (including bundled default artwork), club join/leave count updates, and Message → inbox navigation in the connected browser. New automated cases verify HTTP/HTTPS website validation and club membership persistence, age restrictions, private defaults and explicit visibility. The full suite now passes 26 tests. Production compilation and type checking pass.


## Mobile-first navy / blue / lime refresh

- New palette, locally hosted Oxanium/Manrope fonts, glass surfaces and lime actions verified in the connected browser.
- Profile widths: 320 px at a 320 px phone viewport, 390 px at 390 px, 720 px at a 768 px tablet viewport, and 1280 px at a 1440 px desktop viewport. Document widths equaled viewport widths. Phone, tablet and desktop compositions were visually inspected.
- No page-level horizontal overflow at 320 px on discovery, Halloween event details, friends, event creation, organizer studio and profile. Discovery category pills intentionally scroll within their own row.
- Discovery, Halloween event details, tickets and event creation also checked at 390, 768 and 1440 px: document width equaled viewport width on all twelve checks.
- Ticket opens as a full-screen blue wallet on phones, with white perforated paper, event art, live booking details and a generated CODE128 reference barcode. At 320 px, modal width/scroll width were both 320 px and paper width was 290 px.
- Show QR Code revealed the secure entry QR and changed to Hide QR Code with `aria-expanded=true`; checked-in status showed the used-ticket overlay. Hiding restored the compact ticket.
- Both private and safe export actions completed canvas rendering and displayed their success notifications. The connected browser did not return an export file path, so exported PNG files were not visually inspected. Safe export code omits the private venue, holder identity and all entry/reference codes.
- Ticket export paper grows with wrapped event titles to keep the QR inside its white paper.
- Full test run: 26 passed, 0 failed. Production build and TypeScript passed after palette/font/ticket implementation.

Screenshots: `profile-blue-mobile.jpg`, `profile-blue-small-phone.jpg`, `profile-blue-desktop.jpg`, `ticket-blue-mobile.jpg`, `ticket-blue-small-phone.jpg`, and `explore-blue-mobile.jpg` in `docs/screenshots/`.
