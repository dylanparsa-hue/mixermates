# MixerMates private development source

Start with [Setup on another computer](docs/SETUP_ON_ANOTHER_COMPUTER.md). The current Phase 3 work uses isolated fictional localhost data, independent event approval and disabled real sales. No Hostinger deployment is authorized. Historical notes below may describe older phases; the current setup guide and AGENTS.md take precedence.

> **Current policy — October 19, 2026:** Development is local only. Historical sharing/deployment steps below are not authorization to publish. Follow [DEPLOYMENT_POLICY.md](docs/DEPLOYMENT_POLICY.md) and [LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md). Phase 0 report: [docs/PHASE_0_REPORT.md](docs/PHASE_0_REPORT.md).

# VIBEY

**Find Your Vibe. Find Your People.**

A working local event platform built with Next.js App Router, React, TypeScript, Prisma, and SQLite. The first milestone is implemented, with connected organizer, social, privacy, and admin features. All money-related operations are simulations. No payment credentials or real banking integrations exist.

## Run locally

Requires Node.js 22+ and pnpm. The lockfile pins the tested dependency tree.

```sh
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:setup
pnpm dev
```

Open **http://localhost:3000**. `scripts/dev.sh` can start the app on the current Codex desktop machine, whose bundled Node is outside the normal shell PATH. The existing workspace database is already migrated and seeded.

For a local optimized build: `pnpm build && pnpm start`. The development account switcher is deliberately disabled in production builds. Seeded `@vibey.demo` account logins are also blocked in production. Create real test accounts or use development mode to follow the demo walkthrough.

## Demo accounts — local development only

Use **Sign in → a demo role**, or the avatar menu → demo account. The same user account can attend events and organize them.

| Role | Email | Password |
| --- | --- | --- |
| Attendee | attendee@vibey.demo | VibeyDemo2026! |
| Verified organizer | organizer@vibey.demo | VibeyDemo2026! |
| Halloween event staff | staff@vibey.demo | VibeyDemo2026! |
| Administrator | admin@vibey.demo | VibeyDemo2026! |
| Additional attendee | sarah@vibey.demo | VibeyDemo2026! |

Fictional accounts and events only. Never seed these accounts into a public deployment. The attendee account currently contains a Halloween ticket checked in during verification and a “Sunday Sounds” event draft; register a new account or use Sarah for a fresh invitation workflow.

## Try the complete Halloween loop

1. Sign in as attendee, Sarah, or a new adult account. Open **Halloween House Party** (October 29, 2026, 8 PM MYT).
2. Select a tier → **Request an invitation**. Complete the required phone, invitation, entry-option, and event-rule fields.
3. Choose simulated payment success or failure. An optional **sample** receipt can be uploaded. No real Touch ’n Go QR or wallet connection is used.
4. A successful submission is **Pending review** in Tickets. It has no valid ticket and does not reveal the venue.
5. Switch to **organizer** → avatar menu → **Organizer studio** → **Registrations**. Select Halloween House Party.
6. Review private answers/sample receipt → **Approve & issue ticket**. A decline instead releases inventory and records a simulated refund.
7. Switch back to that attendee → **Tickets** → **Open digital ticket**. The QR token and approved demo venue are available only to the owner.
8. Switch to organizer or assigned staff → **Check-in**. Confirm photo-ID/admission checks. Use the camera or paste the private entry code. **Development test scanner** can load a real issued ticket without using a camera.
9. First scan records a timestamp, staff ID, audit entry, and verified attendance. The second scan is rejected. Simultaneous scans are protected by a conditional transactional update and a unique check-in constraint.
10. The attendee’s **Profile → Event Passport** now contains the verified event and first-attendance badge. Buying a ticket alone never creates attendance.

Camera access requires browser permission and localhost or HTTPS. Actual camera hardware was not used during verification; manual-token and scanner validation paths were tested.

## Other working features

- Public event discovery, local artwork, search across event/venue/city/genre/organizer, category, city, date, age, free-event and price filters. Mobile bottom navigation.
- Interactive MapLibre map with keyless OpenFreeMap tiles, real Malaysian coordinates, zoom controls, event previews, and approximate private-event positions. Internet access is needed for map tiles; the event list remains usable when map services fail.
- Email/password signup, bcrypt hashing, opaque database-backed sessions, logout, profile editing, public image uploads, website links, private defaults, Instagram visibility, and account deactivation.
- Local password recovery demonstration. The dev-only token is loaded into the recovery form; no email is sent. This bypass is unavailable in production.
- Multiple ticket tiers, server-calculated prices, idempotent bookings, free RSVP, simulated payment failure, approval/rejection, inventory reservation/release, refunds, and private QR ticket images. **Safe share preview** excludes the QR and private address.
- Six-step event wizard, artwork upload, event presets, draft save/edit, multiple ticket tiers and registration questions (short/long text, phone, email, dropdown and checkbox). Events with bookings are locked against edits; sales can be paused.
- Organizer dashboard, private registration review/guest CSV, assigned-staff check-in, actual stored metrics, demo earnings, promotion purchase/review, and simulated pending/completed settlement.
- Mobile-first navy/blue glass styling with lime actions, locally hosted Oxanium headings and Manrope body text. Profiles use an immersive phone layout, a two-column tablet layout, and a wide desktop cover with real follower/following counts, About/website links, floating VIBEY achievements, friends previews and music clubs. Club join/leave and membership visibility persist; memberships are private by default.
- Blue ticket wallet with white perforated admission paper, a CODE128 ticket-reference barcode, a separate secure QR drawer, private ticket export, and an exportable share preview that omits entry codes and private venues.
- Adult opt-in profile discovery, public profiles, follow/unfollow, friend requests, accept/decline, friendship-only private messages, block/report, and interest tags. Messages persist; live delivery is not implemented, so revisit Messages to refresh.
- Attendance privacy per event; public profile memories require both account-level public preference and explicit event opt-in. Attendee discovery requires verified attendance. DOB, contact details, receipts, private answers, and full guest lists are never public.
- In-app notifications, mark read, optional social notification preference, and promotional notifications off by default. Email/push delivery is not connected.
- Server-protected admin review for organizer verification, event suspension, promotions, reports, payments, simulated payouts, and audit records.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file for local development. Prisma resolves relative paths from `prisma/`. |
| `DEMO_MODE` | Must be `true` for booking and simulated settlement. No real provider is implemented. |
| `PLATFORM_FEE_BPS` | Configurable fee in basis points. The sample 500 (5%) is a demo setting, not a finalized commercial fee. Amounts are integer sen. |
| `APP_ORIGIN` | Allowed origin for browser writes; update if using a different local port/host. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Public MapLibre style URL; defaults to OpenFreeMap’s dark style. |

No private secrets are shipped in the browser. Sessions use high-entropy random bearer tokens; only their SHA-256 digests are stored in the database. Production cookies use `Secure`; cookies are always `HttpOnly` and `SameSite=Lax`. Browser writes validate Origin. Authentication attempts and activity logging have basic single-process rate limits.

## Database changes

The schema and committed SQL migrations are in `prisma/`. To change the schema:

```sh
pnpm db:migrate --name describe_change
pnpm db:generate
```

For an existing checkout/database, `pnpm db:setup` applies migrations and idempotent seeds. Restart Next.js after schema/client changes. Do not reset a database containing wanted data. For a fresh local database, choose a new filename in `DATABASE_URL`, then run setup.

## Verification

With the development server running:

```sh
pnpm typecheck
pnpm test
pnpm build
```

The HTTP integration tests create uniquely named test accounts and events, exercise real database records and authorization, and clean up their own fixtures. They do not reset seeded demo accounts. Use `TEST_BASE_URL` to point to a separate **local demo** server. They require a development server with `DEMO_MODE=true` for seeded staff/admin access.

The automated suite covers auth, origin checks, private-venue/ticket authorization, event ownership/edit locking, age restrictions, payment failure, idempotency, stock limits, approval/refund, concurrent duplicate check-in, verified passport updates, attendance consent, friendship/messages/blocking, admin promotion review, notifications, saves, and simulated settlement. See `docs/VERIFICATION.md` for execution results.

Optional Playwright discovery/responsive specs are in `tests/e2e/`. Run `pnpm exec playwright install chromium` then `pnpm test:e2e` on a configured local test machine. These specs are provided for repeatability; this session used the connected browser directly for UI checks.

## Before a public launch

This is a local working MVP, not a production launch certification. See `docs/ARCHITECTURE.md` for the security boundaries and remaining work: PostgreSQL-specific migrations/concurrency testing, managed private storage, distributed rate limiting, email recovery, consent/legal review, age/organizer verification providers, real payment/refund/settlement integrations, operational monitoring/backups, and a production security review.

The PWA manifest and icon are included. Offline caching/push, recurring reminders, full cancellation workflows, invitation-link issuance, paid promotional notification delivery, and advanced recommendation ranking remain future work. No subscriptions, venue/table reservations, or real-money services are enabled.

## Artwork and map attribution

Event photography uses downloaded Unsplash placeholders; all event names and organizer claims are fictional. Sources are listed in `docs/ASSETS.md`. The supplied screenshot is inspiration, not a source of copied event/brand assets. The Google Forms reference could not be retrieved; the Halloween form follows the fields explicitly supplied in the project brief.

MapLibre renders [OpenFreeMap](https://openfreemap.org/quick_start/) styles and tiles with their visible OpenStreetMap/OpenMapTiles attribution. Replace the tile provider or self-host when operational requirements warrant it; no paid key is required for this local demo.
