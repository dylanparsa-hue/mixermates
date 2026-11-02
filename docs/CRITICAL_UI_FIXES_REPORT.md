# MixerMates — local UI and account handoff

28 October 2026. **Local implementation and fictional software QA pass. Owner visual acceptance is pending. No deployment or real-sales authority.**

Open **[MixerMates locally](http://localhost:3091/explore)**. The normal entry now leads to one compact local sign-in when needed, then directly to Explore. Developer tools are secondary.

## What changed

- Removed both hero side shapes. Corrected the portrait’s image box and feathered its actual lower/side boundaries, keeping the face sharp. Added restrained warm ambient depth.
- Replaced centered overflow strips with inset native category rails, theme-independent fading, touch scrolling and Home/End/arrow navigation.
- Added semantic light/dark feature roles and shared layout spacing. Light campaigns, cards, forms, menus and operating pages now use coherent light surfaces. The subsequent owner follow-up also adapts the hero to Light, with a pale canvas, dark ink, red CTA and separate image/copy layout; Dark keeps its prior composition. See [focused evidence](light-hero/README.md).
- Repaired event typography, column spacing, ticket-option alignment and mobile ordering: artwork → essentials → description → ticket selection → additional details. Disabled actions state their actual reason.
- Fixed profile/notification outside dismissal, Escape/focus return, route dismissal, mutually exclusive panels and stale notification-request races. Appearance controls use labeled, selected, 44px icons. Notifications remain reachable on phones.
- Organizer: **My events, Payments, Scanner, Event settings**. Actual event metrics and contextual edit/payment/guest/scanner actions replace the long primary menu. Advanced tools and existing routes remain available.
- Admin: **Overview, Events, Accounts, Payments & sales, More / settings**. Events includes all statuses; independent publication reviews refresh the visible list.
- The existing customer identity gains an **ORGANIZER capability**, retaining its role, profile, bookings, tickets, friends and privacy. Customer refund/support queries stay scoped to purchases even after upgrading. Admin authority remains independently granted server-side.

## Simplest owner test

1. Open the local link above. If prompted, use the private `accessCode` in [the local access file](/Users/parsa/.codex/tmp/mixermates-correction-20261028/preview/.local/test-lab-access.json). Do not share that file.
2. Explore a TEST event, choose a ticket and complete registration. Upload [sample fictional evidence](ui-fixes/sample-payment-evidence.png) on its normal booking screen. Evidence alone issues no ticket.
3. In **Review tools**, choose **Independent payment reviewer**. Select the event, enter the exact fictional amount, notes and independent-check acknowledgement; confirm payment.
4. Choose **Independent registration reviewer**, select the booking and approve registration. **Workspace → Customer** returns to the same customer’s tickets.
5. Open the ticket. **Review tools → Entrance staff** opens the scanner. Its private-code/ID-check flow admits once; duplicate entry fails. Hardware camera testing is separate.
6. **Workspace → Organizer** opens the same customer’s event tools. Alex Test’s TEST entitlement is already activated from QA. An unentitled owner fixture sees **Become an Organizer → TEST access** first. Create, save and submit an event; **Workspace → Admin → Events** reviews it as the distinct fictional administrator.

Public paid, free RSVP, private invitation, multiple tiers, approval, manual QR review and limited-capacity fixtures were exercised through normal booking screens. The private scenario is reached through **Review tools → Private TEST invitation**, which creates/redeems an account-bound grant. Preview, draft, cancelled and otherwise ineligible events keep their restrictions.

## Subscription and money

The TEST activation is an authenticated, guarded local simulation using the existing capability table. It charges nothing, creates no billing subscription and does not verify identity, recipients or real events. No production subscription requirement, prices or terms were invented. A future real provider needs an approved product policy and authenticated server-side payment events; browser redirects and receipt images cannot activate paid subscriptions or confirm QR transfers. Organizer-direct receipts remain distinct from platform revenue.

## Evidence and remaining limits

See [before/after review](ui-fixes/REVIEW.md), [all 16 screenshot issues](ui-fixes/ISSUE_REGISTER.md) and [validation](ui-fixes/VERIFICATION.md). The final measured acceptance is **358/358 automated tests**, **10/10 existing Playwright tests**, **252 responsive route/theme checks**, **37 menu/theme/keyboard checks**, a **19-check owner journey**, plus scenario, signup, refund and entry/hover checks. TypeScript, Prisma validation and the optimized build pass. Desktop and phone appearances were visually inspected in both themes.

Physical camera/door acceptance, fresh MySQL/MariaDB parity, real billing/provider integration, business pricing and owner visual approval are not claimed. They do not acquire authorization from this local handoff. Actual Halloween and real events remain **NO-GO**.

**Safety:** loopback servers and isolated fictional SQLite data only. No Hostinger/production access, deployment/upload, hosted DB modification, real payment/subscription, sales activation, public tunnel or external customer message. Thirty-eight recorded protection checks pass, including the canonical local DB, original assets, schema and relevant unchanged guard/Coming Soon files.
