# Light hero follow-up — 28 October 2026

Owner request: adapt and optimize the hero for Light appearance, which previously retained a fixed dark background.

Implemented in `app/styles/cinematic-app.css`: semantic hero palette, pale warm canvas, dark Archivo headline, readable secondary text, red CTA with distinct hover and visible keyboard focus. At 768px and above, copy sits left of the original portrait/disc; phones stack the portrait above copy. Light-specific portrait feathering removes hard lower edges. Original art, logo, text and Dark composition remain. Theme persistence and System resolution use the existing provider.

Verification: 14 rendered theme/width cases (Light/Dark at 320, 390, 430, 768, 1024, 1280 and 1440px); no page overflow or copy/art overlap in Light. Both System resolutions, CTA destination, hover, 48px CTA target, visible 2px keyboard outline and no browser page errors pass. Visually inspected phone, tablet and desktop captures. CSS formatting passes. Colors against the light canvas: headline 16.44:1, supporting copy 5.62:1; button 6.59:1, hover 8.98:1. The warm background tint remains confined primarily to the art side.

- [Light phone](light-390.png)
- [Light desktop](light-1440.png)
- [Dark phone](dark-390.png)
- [Dark desktop](dark-1440.png)
- [Responsive and interaction results](results.json)
- [Contrast and Dark screenshot comparison](contrast-and-dark-comparison.json)

This CSS-only follow-up uses the existing loopback preview and isolated fictional Test Lab. No backend, authentication, database, payment, admission, original bitmap, deployment or production change. Broad suites from the prior handoff were not rerun for this scoped visual change. Owner visual acceptance remains separate.
