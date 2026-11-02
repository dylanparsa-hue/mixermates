# Direct application startup — November 2, 2026

The Coming Soon page, its component/motion code, page-only styles and obsolete standalone packagers are removed. The normal app opens by default. Older `SITE_MODE=coming_soon` values are accepted as a compatibility setting and cannot restore the holding screen. Old `/coming-soon` bookmarks redirect to `/explore`; login/back links and disabled booking exits also lead to the app. Administrator login styling remains in the shared `access.css` file.

New disposable local workspaces initialize with `SITE_MODE=full_platform`. Both new and legacy contained Test Labs keep their full environment, database-marker, loopback and fictional-data guards. Real sales remain locked disabled. Admin roles, private profiles, private invitations/location, cookie/session and write-origin checks remain enforced. No production or canonical DB was opened or migrated, no original assets changed, and no website deployment occurred.

For an older installation, pull the source and prepare a new Lab copy. A prepared Lab is a separate directory: pulling the original clone does not update that old copy. Keep old workspaces to preserve their local data. Exact Windows/Ubuntu update commands are in [SETUP_WINDOWS.md](SETUP_WINDOWS.md#already-have-an-older-copy).

Validation used newly prepared fictional SQLite workspaces and loopback servers:

- General suite: **364 passed, 0 failed, 3 skipped**. Obsolete holding-screen expectations were replaced with direct-app startup and retained access checks.
- Separate startup/access HTTP checks with the legacy mode: **6 passed, 0 failed**.
- Guarded fictional simulator/financial checks with the new mode: **37 passed, 0 failed**.
- Existing desktop/mobile Playwright suite: **10 passed**.
- Browser checks opened the app with legacy and fresh modes at 390px/1440px, captured Light/Dark, and confirmed old bookmarks redirect without page errors. Updated admin-login links and layout were also checked on desktop/mobile.
- Fresh-workspace TypeScript and optimized build passed. Windows/WSL commands were documented but were not executed on this Mac.

Owner preview remains http://localhost:3084/ . This update does not close the unrelated remaining Phase 3 items in the historical handoff or authorize real money/sales.
