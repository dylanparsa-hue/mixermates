# Run MixerMates locally on another computer

This repository is publicly shareable source. Windows users should follow [Windows setup](SETUP_WINDOWS.md) using WSL 2 and Ubuntu. It does not deploy the website. Do not connect production databases, payment providers, hosting or real customer data.

## Install and prepare

Use Node.js 22.23.3 LTS (Node 24 also passed local checks), pnpm 11 and Python 3.9+. No GitHub sign-in is required to clone the public repository.

```sh
git clone https://github.com/dylanparsa-hue/mixermates.git
cd mixermates
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
python3 scripts/prepare-test-lab.py --directory "$HOME/mixermates-local-dev/preview" --port 3084
cd "$HOME/mixermates-local-dev/preview"
node scripts/run-local.mjs dev
```

The preparation script makes a NEW disposable workspace, creates a contained fictional SQLite database, generates Prisma Client, applies migrations, seeds fictional events and provisions the guarded Test Lab. Existing directories are refused. It never copies the original machine's database, `.env`, uploads or credentials. Use another `mixermates-local-<name>/preview` directory to start afresh; do not reset an existing database blindly.

Open **http://localhost:3084/**. A fictional customer session starts automatically. The same identity can create events and use Organizer Studio. The Workspace menu provides Organizer and Admin views; Review tools keeps independent administrator, finance and entrance staff identities. Nothing is publicly reachable: the server binds to loopback only.

The generated `.env` sets a contained `DATABASE_URL`, loopback `APP_ORIGIN`, `SITE_MODE=full_platform`, `TICKET_SALES_MODE=disabled`, `ISOLATED_TEST_DATA=true`, and the explicit local Test Lab, customer test and payment simulator flags. It disables hosted bootstrap, demo booking and external provider configuration. Never reuse these flags in production. `.env.example` documents normal safe defaults. Google credentials are optional and remain outside Git.

For password-based testing, open the local website first and then run:

```sh
node scripts/run-local.mjs accounts
```

This generates fresh unique fictional credentials in **`~/.mixermates-private/MIXERMATES_OWNER_TEST_ACCESS.txt`**, with directory permissions 0700 and file permissions 0600. Do not commit, publish or transfer that file in plaintext. Regenerate credentials on each computer; an encrypted password manager is an alternative for private transfer. This resets only the named fictional Lab personas, never real accounts. It also invalidates their old sessions. Reopen the website afterward. Password hashes cannot be reversed. Google-only accounts use Google.

## Create, review, buy and scan

Create Event → Event Details → Tickets → Design Event Page → Submit for Approval. Save Draft works with incomplete input. Paid tickets use MYR, the fixed 5% fee and the existing server pricing. No bank account is needed to create or submit.

Use the independent Admin view to inspect the actual saved event page and Approve, Decline or Request Changes. Editorial approval does not authorize real sales. Approved fictional simulator events can be purchased from the normal customer event page: Get tickets → select tier → Continue to booking → review details → Confirm Booking → Pay with Test Payment. Choose a fictional outcome. No actual card, bank transfer or funds are involved.

My Tickets opens the persisted TEST ticket and private QR. Review tools → Entrance staff → select the event in Scanner → enter its private entry code → Validate ticket → Confirm admission. A duplicate entry is rejected. This is fictional admission only.

## Checks

```sh
pnpm typecheck
pnpm exec prisma validate
node scripts/run-local.mjs browser
node scripts/run-local.mjs check-social
```

 Browser checks use an installed Chrome channel. They block non-loopback requests. Their screenshots and results go under `.local/phase3-evidence`, which Git ignores. Create credentials before the social/account check.

The full historical suite needs its own isolated server and fixtures. From the clone, prepare a separate workspace, then use two terminals:

```sh
python3 scripts/prepare-local-audit.py --directory "$HOME/mixermates-local-regression" --mode full_platform --port 3087
cd "$HOME/mixermates-local-regression"
node scripts/run-local.mjs dev
# Second terminal, in the same disposable regression workspace:
node scripts/run-local.mjs test
pnpm typecheck
pnpm exec next build --webpack
```

The general suite intentionally skips tests that require a separately guarded simulator or Coming Soon fixture. Run the simulator/financial groups in the Lab with `node scripts/run-local.mjs test tests/payment-simulator.test.ts tests/ticket-commission.test.ts`. The regression marker permits contained SQLite backup/restore checks without machine-specific paths. MySQL schema validation is supported; no hosted MySQL connection or production migration is part of this setup.

For the existing desktop/mobile Playwright suite, prepare another disposable workspace with `--mode coming_soon --port 3088`; run `node scripts/run-local.mjs fixtures`, then start the server and use `node scripts/run-local.mjs e2e`. Credentials and fixtures remain in `.local`.

## Common issues

- **Directory exists:** choose a new destination. The preparer preserves earlier databases.
- **Port in use:** choose a different port when preparing the workspace. The generated origin and server port must match.
- **Prisma engine missing:** rerun `pnpm exec prisma generate` inside the disposable workspace after installing dependencies.
- **Lab returns 404:** use `run-local.mjs`, the generated environment and the contained DB/marker. Clear hosted `DB_*` and external payment/mail credentials. Do not bypass the guards.
- **Login fails:** first open the Lab URL so the guarded local session exists. Generate new credentials with the accounts command and reopen after rotation.
- **Google unavailable:** provider credentials and a live provider test are still required; use fictional local accounts. Google controls its own security notifications.
- **Booking unavailable:** the event needs independent approval, valid future dates and available tickets. Select the fictional simulator; real sales stay disabled.
- **Missing legal terms:** approved platform Booking Terms have not been supplied. The footer page discloses this; event-specific stored conditions remain available.
