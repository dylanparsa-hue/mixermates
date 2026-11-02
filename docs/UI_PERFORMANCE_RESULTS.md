# UI correction performance results

These are measured local Chrome observations, not a Lighthouse score, a universal 60fps claim or physical-device certification. Headless Chrome used a 1440×1000 viewport and CDP 4× CPU throttling. Each scroll sample ran for about three seconds using requestAnimationFrame and 9px scroll steps. Both development and optimized local builds were exercised. Optimized comparisons used the preserved rejected build on loopback 3085 and a separate corrected build on 3083, with private fictional admin sessions. External resources were blocked for these discovery samples.

## Changes driven by inspection

- Removed hero scroll listener/requestAnimationFrame parallax, repeated card IntersectionObservers/Web Animations clip-path entrances and the continuous marquee. One short 480ms transform/opacity hero entrance remains.
- Cards remain visible/static; image hover uses a short transform. Buttons no longer translate or change adjacent layout on hover/press. Page headings no longer run the old blur/reveal layer.
- Removed backdrop blur from the application header and scoped menus/modals. QR remains stable, untransformed and unanimated.
- Added responsive original-photo derivatives: 1600px WebP about 82KB and 800px about 27KB, versus the retained 305KB original JPEG. No new font or animation library was added.
- The phone event list does not initialize/download the map runtime until Map is selected; desktop initializes it when needed. Map listeners and workers are removed when the map is discarded.
- Kept width/height/aspect ratios on critical photos and meaningful layout reservations. The Lab persona bar stays available while scrolling without covering the application header.

## Recorded samples

| Measurement | Rejected development | Corrected development | Rejected optimized | Corrected optimized |
| --- | ---: | ---: | ---: | ---: |
| Sample frames | 181 | 182 | 181 | 182 |
| Frame interval median | 16.7ms | 16.7ms | 16.7ms | 16.7ms |
| Frame interval p95 | 16.7ms | 16.7ms | 16.7ms | 16.8ms |
| Intervals over 33.4ms | 0 | 0 | 0 | 0 |
| Buffered long tasks | 143ms | 143ms | 76, 120, 59ms | 63, 105, 51ms |
| Recorded layout-shift sum | .04890 | .00111 | .04976 | .00084 |
| Script time during scroll | .0603s | .0209s | .0477s | .0234s |
| Layout time during scroll | .00204s | .00027s | .00217s | .000084s |
| Total task time during scroll | .7812s | .1194s | .6690s | .1489s |

Long-task lists include buffered page-load tasks; they are not all scroll tasks. Frame intervals are requestAnimationFrame timing on this machine, not a GPU presentation trace. The optimized last observed LCP entries were 248ms before and 192ms after, under these warm local conditions; this is not a network field-performance promise. Both optimized samples had no page JavaScript errors. The corrected optimized runtime also denied the Lab page/API with 404.

Raw evidence: `ui-correction/performance-before.json`, `performance-after-initial.json` and `performance-optimized.json`. The development samples preceded final small interaction/spacing repairs; the main animation removals and hero asset change were already present. Later changes to permission/error messages and local testing do not claim a new quantified performance gain. A separate actual-Lab layout sample measured the asynchronous persona header causing a .04792 shift within a .04918 total; the persona header was then rendered from the validated server session on initial load to remove that source of movement. The follow-up total was .00109, with no persona-header insertion shift. See `ui-correction/lab-layout-performance.json`.

## Visual and interaction observations

The hero now enters once and stays stable during scroll. Halloween is a static image-to-navy composition with no whole-image opacity fade or theme-dependent white mask. Buttons react without lifting surrounding content. Repeated sections and profile cards remain readable immediately. Reduced motion disables the hero entrance; the responsive/interaction harness verifies that cards have no running animation. Native selects, tabs, disclosures and focus retain normal user control.

The repeated emulated width/theme review covers 320, 375, 390, 430, 768, 1024 and 1440px in both themes. Actual screenshots were inspected in addition to geometry. Basemap loading is external and asynchronous; the event list remains usable when it fails, and missing authorized pins have a clear privacy explanation rather than guessed coordinates.

Remaining limits: real iPhone Safari/Android GPU, touch/camera, low-end hardware and real network behavior have not been certified. Page-load tasks above 50ms still exist. No report claims perfect animation or guaranteed 60fps across devices.
