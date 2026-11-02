# Phase 1 rendered QA

October 19, 2026. Native Chrome with responsive device toolbar; screenshots captured through Chrome UI at 2x DPR. Actual images were inspected, then a fresh independent Impeccable reviewer inspected all seven widths. Verdict **ship**, no material fixes. Design-system documentation confirms an established-system extension. No browser code execution, external browser automation or public tunnel was used.

| CSS viewport | Capture | Result |
| --- | --- | --- |
| 320 × 568 | screenshots/user-320.png | Logo/status, compact visual, exact copy and footer fit; no horizontal clipping |
| 375 × 812 | screenshots/user-375.png | Intact mobile visual-first composition; readable supporting text |
| 390 × 844 | screenshots/user-390.png | Intact headline/logo and footer; comfortable control height |
| 430 × 932 | screenshots/user-430.png | Full mobile composition and safe gutters |
| 768 × 1024 | screenshots/user-768.png | Two-column tablet composition fits without overlap |
| 1024 × 768 | screenshots/user-1024.png | Balanced copy/art, footer visible |
| 1440 × 900 | screenshots/user-1440.png | Large desktop headline and ribbon, restrained navy ground |

Pause toggled to Resume ambient motion with aria-pressed=true. Chrome's CSS prefers-reduced-motion: reduce emulation produced a complete static design and removed the redundant pause toggle. Preference was reset when DevTools closed. CSS also disables nonessential entrance motion under reduced preference. Keyboard focus uses visible outlines; body/secondary text uses high-contrast near-white/lavender on navy; decorative ribbon is aria-hidden. All footer/motion controls have 44px minimum height. Screen-reader and physical-phone/GPU/Safari certification were not performed.

Fresh reload console had no application errors/warnings; development HMR/React DevTools informational messages remain expected. An unused large-symbol preload warning found during implementation was removed by relocating the original global loading boundary behind authorization. Public root now redirects to the dedicated Coming Soon route so the feature-rich platform is not part of its render. Network inspection of /coming-soon showed **0 /api/ requests**; no discovery/user/private JSON is fetched. Production smoke confirms required logo/static paths return 200. No heavy animation library, video, external animation API, waitlist or fabricated social destination was added.

Browser session exercise: entered the existing local generated admin credential at /admin/login; preview displayed ADMIN PREVIEW — NOT PUBLIC / Sales disabled and real preserved application. Declined browser password saving. Sign out returned to /coming-soon; browser Back did not restore the preview. Direct-entry, refresh/session expiry/invalid/revoked/changed role, ordinary-account and RSC/prefetch boundaries also have local HTTP test evidence.

Limits: emulation is not a physical-device test or quantitative Lighthouse/GPU performance certification. Static screenshots alone do not prove motion; pause/reduced-motion were exercised separately. No approved comp or quality-bar card exists; the review used the user's pinned brief. Incumbent system sidecar/format drift was documented without unsolicited repair.

## Owner logo correction

The rejected decorative ribbon was removed. All seven widths were captured again using the actual official symbol; see screenshots/logo-correction/logo-<width>.png. The unchanged typography, controls and responsive structure fit around the upright mark without clipping. The older screenshots above remain historical, not the current visual truth. Fresh independent review: logo-correction-review.md.
