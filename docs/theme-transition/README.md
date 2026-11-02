# Theme transition — 28 October 2026

Owner request: conceal the sudden hero layout change between Light and Dark with a smooth transition or brief MixerMates logo page.

Implemented a 680ms brand curtain: fade in for 160ms, commit the alternate appearance while completely opaque, then hold briefly and fade out over a 520ms sequence. It uses the original dark MixerMates logo on the established charcoal surface, with opacity only and no added library, spinner, loading claim or network wait. It appears only for actual resolved appearance changes on application/customer screens. Startup, same-color selections, Coming Soon, reduced motion and unavailable animation support apply immediately without the curtain. Rapid changes cancel the older animation and preserve the latest preference. The decorative cover does not take keyboard focus or add screen-reader noise; it blocks pointer clicks during its brief display.

Verified locally with isolated fictional data:

- Six actual account-menu theme interactions: both directions at 390, 768 and 1440px. Every observed theme mutation occurred at cover opacity 1. Selected radio, stored preference and keyboard focus remained correct.
- Three rapid reversal sequences, both System resolutions, saved preference on reload, reduced motion, missing animation API and throwing animation API; 14 total browser scenarios, no page errors or stranded cover.
- Seven existing theme initialization tests pass. TypeScript and formatting checks pass.
- Mobile/desktop logo cover and settled Light captures visually inspected. No hero art, layout or backend changes in this follow-up.

[Phone cover](logo-cover-390.png) · [Desktop cover](logo-cover-1440.png) · [Results](results.json)

Local development only. No production access, deployment, payment or release authorization. Owner visual acceptance remains separate.
