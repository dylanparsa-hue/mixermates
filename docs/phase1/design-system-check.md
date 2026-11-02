> Historical initial review. Owner logo correction replaces the separate ribbon described below with the exact official processed symbol. Current evidence: logo-correction-review.md and screenshots/logo-correction/. No global design-system change.

# Coming Soon design-system check

Outcome: established-system extension; preserve the incumbent system. The code-led Coming Soon surface follows the pinned MixerMates brief and the reviewer’s `ship` disposition in [design-review.md](design-review.md). This records local design readiness only; it grants no deployment or release authorization.

## Evidence checked

- `PRODUCT.md`, `DESIGN.md`, and `.impeccable/surfaces/coming-soon.md` establish the existing brand, phone priority, and five direction blocks.
- `components/coming-soon.tsx`, `components/coming-motion.tsx`, and `app/styles/coming-soon.css` provide the built composition, type sizes, palette, responsive rules, and motion controls.
- `components/brand.tsx`, `public/branding/processed/asset-report.json`, `app/styles/brand-theme.css`, `app/styles/base.css`, and `app/layout.tsx` establish the official image source, brand colors, and local fonts.
- Visually inspected `.impeccable/review/user-320.png`, `user-375.png`, `user-390.png`, `user-430.png`, `user-768.png`, `user-1024.png`, and `user-1440.png`. These supplied captures show the complete three-line headline, full lockup, compact mobile artwork above the copy, desktop artwork beside it, and discreet footer controls without visible horizontal clipping. No browser session was opened for this documentation pass.

## Inherited system

The official full lockup comes from `BrandLogo` with its explicit dark variant (`/branding/processed/mixermates-logo-dark.png`); it is not recreated with text or SVG paths. The SVG ribbon is separate decorative artwork, not a replacement official logo. Its purple and pink endpoints use the sampled brand colors (`#532fea` and `#ed07fb`); lighter and darker stops render highlights and depth for this artwork only.

The midnight ground (`#090b18`), navy atmosphere (`#101632`), near-white ink (`#fafaff`), Oxanium display family, and Manrope body family match the incumbent system. Display type uses the existing `--font-heading` variable; body type inherits the existing Manrope stack through `--font-body`. These family definitions continue to be owned by the root layout.

## Scoped implementation values

These values describe this surface as built. They are not additions to the project-wide token contract.

| Concern | Observed source values and behavior |
| --- | --- |
| Palette | `.coming-shell` owns `--coming-bg: #090b18`, `--coming-ink: #fafaff`, `--coming-muted: #bdb8d3`, `--coming-line: #2e2944`, `--coming-purple: #532fea`, and `--coming-pink: #ed07fb`. It intentionally presents a fixed dark surface independently of the app preference. |
| Display | Oxanium, weight 600, line-height 1.02, tracking −0.035em. Default size `clamp(56px,6.6vw,92px)`; at widths through 1024px `clamp(50px,7.1vw,74px)`; mobile through 767px `clamp(40px,11.4vw,66px)`. |
| Support | Manrope, weight 400, line-height 1.7, maximum 34ch. Default `clamp(16px,1.45vw,20px)`; mobile 15px, then 14px below 360px. |
| Layout | Header/footer maximum width 1440px; main stage maximum 1320px; desktop grid ratio 1.05:1. At widths through 767px the stage becomes a column, maximum 480px, with the artwork ordered first and 24px minimum side gutters. Safe-area padding is respected. |
| Controls | Transparent low-emphasis motion and footer controls have a minimum 44px height. Focus uses a 2px `#c6adff` outline with 5px offset. Actual SVG icon components accompany readable labels. |
| Depth and shape | Restrained ambient radial gradients and rounded ribbon strokes create depth; no card scaffold is introduced. Ribbon highlights, dark under-strokes, and the −8° overall orientation remain artwork details. |
| Motion | Arrival lasts .7s with `cubic-bezier(.16,1,.3,1)`; ribbon drift lasts 12s with alternating ease-in-out. Animation is enabled only with `prefers-reduced-motion: no-preference`; the native pause button sets `animation-play-state: paused`. Reduced-motion CSS removes the toggle. These are source checks; static captures do not prove runtime behavior. |

The uppercase “COMING SOON” text is the brief’s actual status. It is not adopted here as a reusable eyebrow convention. The full lockup on mobile and fixed-dark presentation are specific choices for this pinned surface; they do not replace the incumbent application’s mobile symbol or Light/Dark/System guidance.

## System preservation and limits

No new visual world or system replacement was approved. `DESIGN.md` is unchanged. `.impeccable/design.json` is absent in the inspected checkout and was not created; absence is preserved rather than silently reconstructing a system sidecar. The incumbent `DESIGN.md` is a concise narrative without the reference format’s machine-readable frontmatter; this documentation pass does not modernize it or treat that pre-existing format difference as a reason to rewrite it.

No defects or additional global rules were canonized. The palette variations, ribbon geometry, fixed-dark surface, and local type scale remain scoped implementation details. Application-wide drift and nonvisual acceptance are outside this check. No application code, original assets, hosting configuration, or deployment state was changed.
