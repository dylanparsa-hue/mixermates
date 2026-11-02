# MixerMates brand update — October 19, 2026

The existing application, accounts, bookings, privacy controls and organizer workflows are retained. Branding uses the user's actual supplied artwork. Internal session and database identifiers remain unchanged to preserve compatibility.

## Artwork preparation

Originals are archived unchanged in `public/branding/original/`. The full logo is a 2048×2048 opaque JPG; the standalone symbol is a 3000×3000 PNG with actual alpha. The PNG's visible bounds were x755–2245, y833–1705, so its visual center was (1500,1269), 231px above its canvas center.

`scripts/prepare-brand-assets.py` extracts the original wordmark and gradient artwork, removes the navy background and corrects background contamination in fractional-alpha edge pixels. It crops actual artwork bounds and adds symmetric breathing room. Square app icons center those visible bounds, without stretching or clipping. Proofs on navy, black, white, square and circular backgrounds are in `public/branding/processed/brand-proof.png`.

Production files are optimized transparent PNGs, deliberately preserving raster geometry and original glyph spacing rather than introducing approximate SVG curves. The horizontal navigation lockup arranges the original symbol beside the original wordmark; stacked variants preserve the supplied large-format composition. The dark variant keeps white “Mixer” and pink “Mates”; the light variant changes only the white letters to dark navy. The symbol gradient remains unchanged.

## Created files

| File or group | Purpose |
| --- | --- |
| `public/branding/original/*` | Untouched supplied JPG and PNG |
| `public/branding/processed/mixermates-logo-{dark,light}.png` | Transparent horizontal full logos, 853×160 |
| `public/branding/processed/mixermates-logo-stacked-{dark,light}.png` | Transparent stacked full logos |
| `public/branding/processed/mixermates-symbol.png` | Tightly bounded transparent mark, 1514×896 |
| `public/branding/processed/mixermates-app-icon.png` | Centered transparent 1024px app artwork |
| `public/branding/processed/mixermates-icon-{32,180,192,512}.png` | Browser, Apple and installable-app icons |
| `public/branding/processed/mixermates-social.png` | Branded Open Graph sharing image |
| `public/branding/processed/{asset-report.json,brand-proof.png}` | Measured source information and visual proof |
| `components/brand.tsx` | Reusable BrandLogo and BrandSymbol with accessible labels and preserved proportions |
| `components/theme.tsx`, `lib/theme-init.ts` | Shared theme provider, accessible controls and pre-paint initialization |
| `app/styles/brand-theme.css` | Central semantic tokens and cross-page theme refinements |
| `scripts/prepare-brand-assets.py` | Repeatable source-art processing |
| `scripts/centralize-theme-colors.py` | One-time migration utility; do not rerun blindly after manual refinements |
| `tests/theme.test.ts` | Seven theme initialization tests |
| `PRODUCT.md`, `DESIGN.md`, `docs/BRANDING.md` | Product constraints and brand implementation guide |

## Modified areas

`app/layout.tsx` adds theme initialization/provider, correct icons, theme-color metadata and branded social metadata. `app/globals.css` loads the final brand system. Existing files in `app/styles/` now use semantic tokens while retaining their layouts and breakpoints.

`components/vibey.tsx` updates shared navigation, footer and account menu. `components/explore.tsx` adds cinematic event photography and branded discovery. `components/auth.tsx` brands login and registration. `components/profile.tsx` adds Appearance preferences; `components/profile-sheet.tsx` uses the actual member symbol. `components/shared.tsx` and `app/loading.tsx` use the mark in loading states. `components/map.tsx` selects a matching light/dark basemap. `components/digital-ticket.tsx` brands the ticket and downloadable ticket. `public/manifest.webmanifest` uses the new icon set. Packaging includes this guide and product/design documents.

Obsolete unused lime collectible art and the previous generic M icon were moved into the recoverable local archive `/Users/parsa/.codex/tmp/mixermates-previous-art/`; they are excluded from deployment.

## Logo placements

The full logo is used in desktop navigation, authentication dialogs and the footer shared by public pages and organizer screens. The standalone mark is used in the mobile header, app/browser icons, discovery feature, profile membership badge, loading indicators and digital ticket header/download. Existing user avatars remain user content.

## Theme controls

Choose Light, Dark or System in the desktop header, account menu, profile Appearance section, or footer. System is the default and follows the operating system. A saved override persists in the browser, applies before initial paint, synchronizes between tabs and switches immediately without a reload. Clearing browser storage resets it. Reduced-motion preferences disable nonessential animation.

Both themes share semantic background, foreground, surface, card, border, muted, primary, accent, ring and brand tokens. Sampled logo hues are purple #532FEA, violet #9E1FF0 and pink #ED07FB. Small text and white-label buttons use contrast-adjusted shades. Photographic overlays retain explicit white-on-dark roles. Tickets retain white paper and dark ink in both modes; QR credentials remain separate from public previews and safe-share exports.

## Verification

- Production Hostinger build and TypeScript validation passed. Hostinger deployment completed successfully; live HTTPS discovery, logo assets, icons and manifest returned 200. The event API returned all seven seeded events.
- Live Light/Dark/System switching and saved Light preference after reload were verified; the original System preference was restored after testing. The branded sign-in dialog was also inspected.
- All 36 application tests passed, including seven theme tests and existing ticket/privacy tests.
- Impeccable mechanical detector returned no findings for the changed interface files.
- Checked desktop and 393×852 phone previews in light and dark; checked profile, event detail, organizer dashboard and digital ticket presentation.
- Checked theme switching, consistent control selection, cross-tab synchronization and persistence after reload.
- Checked logo transparency on contrasting backgrounds and centering in square/circle proofs.
- Calculated key text/action contrast ratios of at least 4.5:1; no application errors were visible in the development console.
- Screenshots are stored locally in `docs/screenshots/brand-*.png`; ticket screenshots are intentionally excluded from the public source handoff.

## Limits

These are faithful raster production assets, not editable vector masters. A future designer can supply authoritative vectors for unlimited print scaling. Phone checks use Chrome device emulation; physical iOS/Safari and Android devices still deserve a final device check. Existing simulated payments remain simulated. No new transactional email provider or new About page was introduced by this visual update.
