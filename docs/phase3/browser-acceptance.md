# Phase 3 actual browser acceptance

Local preview only: localhost:3001, separate fictional SQLite. Performed through the in-app Chrome browser; no browser-network or hidden app-state injection. Standard local fixture accounts are fictional; credentials are omitted here.

| Journey | Observed result | Evidence |
| --- | --- | --- |
| Organizer login and create | Seven-step editor, owned poster upload, House Party, future overnight date, private fictional venue, capacity 40, RM35 tier | wizard-desktop-light.png; wizard-mobile-light.png |
| Persist/reopen/edit | Saved draft, refreshed/reopened, retained name/price; second save works; native date commit fixed and persisted Dec 12/13 | wizard-desktop-light.png |
| Required question/preset/preview | Instagram requirement and House Party preset persisted; preview reads saved data | event-preview-mobile-dark.png |
| Private payment setup | Uploaded explicitly non-payment fictional QR; pending version and image visible; light/dark | payment-mobile-dark.png; payment-mobile-light.png |
| Ordinary attendee denial | Organizer-login attempt rejected; no privileged workspace | observed UI denial; HTTP negatives also automated |
| Admin recipient review | Actual QR shown, fictional procedure/notes/check recorded; version 1 approved | admin-qr-desktop-light.png |
| QR replacement | Owner submits version 2; version 1 remains approved/active; no history overwrite | final admin-event-published-desktop.png includes both records in DOM |
| Submit/publish | Owner assigns approved destination and submits; pending locks; independent admin approves; event PUBLISHED locally | admin-event-published-desktop.png |
| Responsive saved preview | Start AND overnight end plus timezone, readable permission/location labels, RM35 and disabled booking | event-preview-{320,768,1440}-dark.png; mobile390 capture |
| Anonymous boundary | Sign-out followed by known private-preview URL returns Coming Soon, official logo | anonymous-coming-soon.png |

Layout measurement: document width equals viewport at 320, 768 and 1440; all main preview images loaded, recorded in browser-layout.json. The 390px mobile check was also observed; no physical phone/Safari certification is implied. Full-page wizard/preview captures and viewport payment/admin captures have different coverage, named accordingly.

Two reviewer copy findings (raw date/enums and missing overnight end) were fixed together and affected viewports recaptured; independent reviewer returned ship for those fixes. No new console errors occurred in the accepted final journeys; the dev tab's historical log includes an earlier transient JSX compile error that was corrected. Staff assign/revoke/scoped negatives, cross-owner/private QR denial, rejection/correction/suspend, invalid prices and booking protections were exercised by automated HTTP/service tests, not all manually repeated in the browser. Optional Playwright suite and physical scanner were not run.
