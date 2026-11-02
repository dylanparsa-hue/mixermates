# Current complete-website release — 29 October 2026

The owner authorized the complete public demo application at https://mixermates.com. Current deployment/version/checksums are recorded in [PUBLIC_RELEASE_REPORT.md](PUBLIC_RELEASE_REPORT.md) and `public-release/deployed-version.json`. This supersedes the historical Coming Soon/source/seed instructions below for this release.

Managed Next.js, Node 22.x, pnpm; root `MixerMates-website`, build `pnpm run build`, output `.next`. Generate a sanitized archive with `python3 scripts/package-public-release.py <private-output.zip>`. It includes the latest application and a pinned `public_demo` release scope; it does not include `.env`, databases, uploads, local fixtures, passwords or recovery material.

Production requires `APP_ORIGIN=https://mixermates.com`, `SITE_MODE=full_platform`, `TICKET_SALES_MODE=disabled`, and a private MySQL connection. Keep `DEMO_MODE`, `HOSTINGER_DATABASE_BOOTSTRAP`, `HOSTINGER_SEED_DEMO`, `ISOLATED_TEST_DATA`, `LOCAL_CUSTOMER_TEST_ENABLED`, `LOCAL_DEMO_BOOKING_ENABLED`, and `MYSQL_DISPOSABLE_TEST` false/absent; `MIXERMATES_TEST_LAB` must be disabled/absent. Keep the verified `TOKIO_WORKER_THREADS=2` and `RAYON_NUM_THREADS=2` host limits. The build never migrates/seeds and startup refuses unsafe configuration.

Google connection is configured and tested live with real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` stored securely in Hostinger, and the exact HTTPS callback configured in Google Cloud. Google app publishing remains Testing pending an approved privacy-policy URL; basic sign-in works under the documented Google exception. See [GOOGLE_LOGIN_SETUP.md](GOOGLE_LOGIN_SETUP.md). Do not copy secrets into source or reports. Hostinger environment changes trigger a rebuild of the current uploaded source.

The four approved fictional demos were installed explicitly, once, after verified backups and additive migrations. Do not run general seed/reset scripts on production. Future events are manually created by authorized organizers and independently reviewed. No real payment, billing, sales, paid-event activation or admission is authorized by this release. Private rollback backups/inventory/recovery are outside the source tree.

## Historical deployment notes — superseded

The following earlier setup is preserved as history. Its seed/demo/bootstrap settings and old archive instructions must not be used for the current release.

# Hostinger deployment

Domain: https://mixermates.com. Managed Next.js hosting, Node 22, pnpm.

Upload `/Users/parsa/Desktop/MixerMates-hostinger.zip`; root directory `MixerMates-website`, build `pnpm run build`, output `.next`. The upload package makes the default build call `scripts/hostinger-build.mjs`. The working copy retains its SQLite development build. Recreate the sanitized ZIP with `python3 scripts/package-hostinger.py`; this switches only the packaged schema and migrations to MySQL so hosting lifecycle scripts cannot regenerate a SQLite client.

The hosted build generates the MySQL client, builds with webpack and includes runtime database tools in the standalone artifact. At startup, instrumentation applies non-destructive migrations from `prisma/mysql/migrations`. Optional initial fictional data is seeded only when no events exist; production seed account passwords are randomized.

## Environment

Configure DATABASE_URL with the Hostinger MySQL database connection, including a URL-encoded password. Store credentials only in Hostinger. APP_ORIGIN=https://mixermates.com; HOSTINGER_DATABASE_BOOTSTRAP=true; HOSTINGER_SEED_DEMO=true; DEMO_MODE=true; PLATFORM_FEE_BPS=500; NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/dark.

## Persistence and privacy

MySQL stores accounts, events, bookings and image bytes independently of deployments. Public images use `/api/media/<token>` with no extension so Hostinger’s static image handler does not intercept dynamic database content. Existing stored uploads can also be read through that API token. Private receipts are returned only to their owner or event organizer. Development SQLite files and uploaded files are excluded from the source ZIP. Existing local data is preserved locally and is not copied to the hosted database.

Payments remain explicitly simulated. Real payment collection and payouts require a separate production provider integration. Hostinger displayed a hosting expiry warning of seven days during setup; the account owner must verify renewal.

## Live verification — October 18, 2026

HTTPS discovery and seven seeded events respond successfully. Registration, logout, hashed-password login, authenticated tickets, anonymous ticket denial, database image uploads and private image denial passed against the live domain. An image uploaded before the final deployment remained retrievable afterward through its media API token. All 29 local application tests passed. Screenshot: `docs/screenshots/hostinger-live-desktop.png`.

Deployment verification created three synthetic `deploy_*@example.test` accounts and tiny test images; no real user information was used.

## MixerMates rename

Visible UI, browser title, installable-app name, M icon, hero artwork, profile labels, ticket exports and system welcome text use MixerMates. Verified in desktop and 393px iPhone previews. Existing session cookie identifiers are retained to preserve signed-in sessions. The icon has a new `/mixermates-icon.svg` address to avoid the old CDN cache.

## Official logo and theme update — October 19, 2026

The current package uses transparent official MixerMates artwork, new PNG icon paths, branded Open Graph metadata and persistent Light/Dark/System preferences. The earlier SVG icon and lime hero described above are superseded. All 36 local tests and the production build passed before upload. See `docs/BRANDING.md` for the complete asset and theme guide.

The October 19 brand deployment completed successfully (1m 43s). Live discovery, official logo assets and manifest return 200; `/api/events` returns seven events. Light/Dark/System controls and reload persistence were verified on the domain.
