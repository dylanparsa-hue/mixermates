# Coming Soon: proposed one-time manual Hostinger release

**Preparation only. Nothing uploaded or deployed. Fresh owner approval is required.** Source candidate: Desktop/MixerMates-coming-soon-release.zip. Do not reuse older Hostinger/source ZIPs. This archive is pinned to Coming Soon in lib/release-scope.ts; changing SITE_MODE alone cannot expose the full platform. Real sales remain disabled.

## 1. Files and build settings

Upload only the reviewed new source ZIP after approval. It includes app/components/lib, processed official branding, public stock/event images and local fonts/licenses, framework config, lockfile, MySQL schema and two build helpers. It excludes .env, databases, migrations/seeds, tests, fixtures, development provisioning, private uploads, original image archives, backups and node_modules/.next. app/uploads is protected route **code**, not a directory of private uploaded bytes.

Hostinger: Next.js, Node 22.x, pnpm, root MixerMates-coming-soon, build `pnpm run build`, output `.next`. The candidate's build script generates the MySQL client, builds with webpack and copies required standalone runtime dependencies. It does not run migrations or seeds. If the host uses a standalone entrypoint, use `.next/standalone/server.js` and the candidate build already copies public and .next/static into their expected standalone paths; confirm the host's start convention before switching traffic. Existing managed Next.js import settings must be recorded first.

## 2. Exact environment proposal (apply only after approval)

| Key | Value / owner action |
| --- | --- |
| SITE_MODE | coming_soon |
| TICKET_SALES_MODE | disabled |
| DEMO_MODE | false |
| LOCAL_DEMO_BOOKING_ENABLED | false |
| ISOLATED_TEST_DATA | false |
| HOSTINGER_DATABASE_BOOTSTRAP | false |
| HOSTINGER_SEED_DEMO | false |
| APP_ORIGIN | https://mixermates.com |
| PLATFORM_FEE_BPS | Preserve existing configured value; no real sales in this release |
| DATABASE_URL | Existing compatible MySQL connection, secret entered privately in hosting; never the SQLite or test URL |
| DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD | Alternatively preserve existing managed connection settings; these override DATABASE_URL when DB_PASSWORD/DB_NAME/DB_USER are set. Do not mix stale settings. No values copied into this document/archive |
| NEXT_PUBLIC_MAP_STYLE_URL | Preserve current approved public style URL; not needed by Coming Soon |
| SOCIAL_INSTAGRAM_URL / SOCIAL_TIKTOK_URL | Leave absent unless owner supplies actual HTTPS account URLs |

NODE_ENV production is managed by the host. No launch date/countdown or waitlist env is introduced. A local MySQL client build does not certify live connectivity, schema parity, TLS, runtime or host proxy behavior.

## 3. Admin access

/admin/login checks bcrypt password, active ADMIN role, hashed database session, same-origin and generic errors. Cookies are HttpOnly/SameSite=Lax and Secure in production. Do not use seeded .demo accounts, user profile verification, local storage or query flags. No test account or password ships in the archive.

Before owner-approved admin preview on hosting, identify an existing legitimate administrator whose password is privately controlled by the owner. If none exists, stop that provisioning step: arrange a separately authorized audited account setup against the existing schema; owner enters the new password privately, store only bcrypt hash, set role ADMIN/active, revoke any obsolete sessions. The local provisioning helper deliberately refuses production. The public page can be published without provisioning an admin; do not alter production user roles implicitly.

## 4. Preserve production data

No schema/model migration is needed in Phase 1. The pinned release skips hosted bootstrap even if old flags were accidentally left on; the proposed settings also explicitly turn them off. Do not run migrate, db push, setup or seed on hosting. Existing user and event data remain in the existing DB. Login/logout naturally create/delete session records when explicitly used after approval; this is distinct from bulk DB modification.

## 5. Before touching hosting

Owner approves this exact candidate and planned one-time release. Record SHA-256 from docs/phase1/release-audit.json. Inspect hosting start/root/build settings and account-level auto-deployment integrations read-only. If unexpected integration exists, resolve it before uploading; no branch pushes are needed.

## 6. Backup

Download the current deployable files/artifact and exact build/start/root settings. Export existing MySQL using hosting's normal backup tools and verify the backup is readable; preserve persistent uploads separately. Save current environment privately in an owner-controlled secret store (never chat, repo, screenshots or candidate). Record timestamp, responsible person and restore path. Do not proceed without a recoverable previous artifact and settings.

## 7. Approved release procedure

Use the manual ZIP flow for the exact candidate. Set the explicit safe modes above, preserve legitimate DB connection, build, inspect logs for failures, then switch/restart through the host's normal approved flow. No DNS change is expected. Do not silently fix a failed build by enabling bootstrap or reseeding. Stop/rollback on any private route or sales leak.

## 8. Post-release smoke checks

Root redirects to Coming Soon; logo/fonts/icons/copy render at phone/desktop sizes; pause and reduced motion work. Anonymous and ordinary accounts cannot enter explore/profile/admin/organizer/private event/tickets. APIs return safe JSON 401/403/404, no private data or receipts. A legitimate admin can sign in, sees ADMIN PREVIEW — NOT PUBLIC, and loses access after logout/back/refresh. Booking/review/refund/payout/promotion remain disabled. Verify HTTPS Secure cookies, no-store/Vary behavior at the host/CDN, safe metadata/robots, missing socials hidden and no console/network errors. Confirm no migrations/seeds ran. This hosting certification has **not** been performed locally.

## 9. Rollback

If a smoke check fails, restore the saved previous artifact and private environment/build/start/root settings using the manual host flow. Verify the restored website and DB connectivity. Because this release has no schema migrations, no database rollback should be necessary; do not overwrite live data merely to roll back files. Restore a DB backup only for verified corruption under a separate explicit recovery approval. Record the incident and retain Coming Soon isolation if possible. Rollback to the old app can restore its old exposure risks, so the owner must understand the fallback before release.

## 10. Later development and final launch

Keep all development on loopback with isolated SQLite data. No tunnels, auto-deploy branches or repeated development uploads. The pinned Coming Soon artifact cannot unlock full_platform via env alone. Final platform release needs a newly reviewed artifact, resolved AUD-01..04 and all launch safeguards, MySQL/restore/scanner/security acceptance, and fresh owner authorization. Phase 2 starts only from its separate master prompt.
