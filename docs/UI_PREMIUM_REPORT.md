# Premium reference redesign — 28 October 2026

Implemented locally in the existing application. Owner visual acceptance remains pending. No release or sales authorization is implied.

## Visible changes

- Discovery starts with location, a compact heading, search and categories. A vertical date rail accompanies photographic event cards; the former marketing hero and promotional blocks are removed.
- Event photographs carry concise title, city, date/time and price. Desktop uses a featured two-column photograph and smaller catalogue cards; phones use portrait cards.
- Event detail leads with a full photograph, circular overlay controls and a rounded information panel. Mobile has a safe-area-aware price/action bar; actual tier availability and sales restrictions still determine eligibility.
- Admission passes use event artwork, a concise two-column information grid, ticket perforation and the existing secure QR. The redundant reference barcode is removed from this UI. Actual status, personal holder/tier and authorized location remain.
- Booking retains its three real stages. Payment instructions use a compact QR and disclosure for longer financial information. Evidence never substitutes for independent funds or registration approval.
- Manrope, neutral light/dark surfaces, consistent gutters, quiet borders, smaller profile composition and restrained operating surfaces replace the outgoing typography/palette. The Lab's actor selector and persisted workflow state remain.
- Responsive WebP derivatives preserve original photographs; the large profile cover derivative drops from1.8MB PNG to roughly45KB at960px. Protected uploads keep their original authenticated URL. No reference celebrity photographs are imported.

## Reference adaptation

Actual supplied order: Image1 supplies photo-to-paper detail composition and restrained dark discovery; Images2/3 supply light editorial catalogue, black category choices, vertical dates and pass structure; Image4 supplies charcoal dark mode, rich photographs and quiet white QR presentation. This combines their compositions with MixerMates's existing content and workflows rather than copying unlicensed artwork.

[Actual before/after screenshots](premium-ui/BEFORE_AFTER.md) include mobile/desktop discovery and detail, digital ticket, checkout/payment, community/profile and Lab. Dark variants and all requested discovery/detail widths are retained. QR credentials are masked in evidence; the private local UI displays the secure code.

## Executed checks

| Check | Result |
| --- | --- |
| `pnpm test` |356 passed,0 failed,0 skipped |
| Existing Playwright suite |10 passed; only the changed discovery heading selector was updated; assertions retained |
| `pnpm typecheck` | Passed |
| `pnpm exec prisma validate` | Passed |
| `pnpm exec next build --webpack` | Passed in isolated production-mode build copy |
| Responsive/theme checks |210 records across15 surfaces ×7 widths ×2 themes; no measured overflow, broken images, card-edge text or oversized person-action wraps |
| Focused interactions |8 groups passed: search/filters/reset, date selection, save/revert, keyboard community tabs/empty state, mobile booking anchor, Light/Dark/System, landscape, reduced motion |
| Independent visual review |6 enumerated material findings corrected and scored resolved; last wallet verdict SHIP for local owner review only |

Requested widths:320,375,390,430,768,1024,1440px. Primary discovery/detail screenshot every width/theme; other covered surfaces390/1440 with geometry at all widths. Final ticket screenshots include top and actual scrolled-bottom dialog states. Review caught and corrected inherited ticket title/modal styling, checkout padding, profile fallback outline, wallet selection/date/photo shading and a5px admin button overflow.

The original test baseline now contains356 cases. No test was removed or weakened. Repeated automated sessions reached existing administrator/Lab429 rate limits; no limiter was disabled/reset. Clean existing browser acceptance ran against a fresh owned fictional copy; focused interactions passed separately after the window changed. The210 final visual records were already complete/clean before a redundant persona switch reached the Lab limiter. Build initially ran with the development runner's NODE_ENV and failed global-error prerendering; rerunning under the correct production build environment passed without a framework change.

Fictional journeys additionally passed normal signup, duplicate rejection, login/recovery, role denial, opt-in friend acceptance and persisted messaging; actual registration/reservation; sample and actual evidence upload; independent finance confirmation and registration approval; real rendered QR decoding; ID-attested check-in/duplicate rejection; independent reschedule review/original terms; refund approval/fictional transfer/customer acknowledgement; cancellation impact confirmation/revocation/entrance denial. No external messages or money moved.

## Measured performance and limits

One desktop Chromium optimized-runtime sample with4× CPU throttle and3seconds of scripted scrolling: before p95 frame16.8ms/after16.7ms; both had0frames above33ms. Scroll task time was0.1493s/0.0758s. Loading LCP was212ms/512ms and CLS0.00084/0.021; both CLS results are below0.1. This single local sample does not prove universal speed or60fps on phones. The new first photo depends on the authorized event API response. Heavy original profile artwork now has responsive derivatives; removed hero/marketing imagery no longer delays entering the catalogue. See [measured values](premium-ui/performance-optimized.json).

## Local preview and safety

Open **http://localhost:3091/test-lab**, enter the private access code from `/Users/parsa/.codex/tmp/mixermates-correction-20261028/preview/.local/test-lab-access.json`, then **http://localhost:3091/explore**. Role switching retains separate server-authorized identities. Restart instructions: [local development](LOCAL_DEVELOPMENT.md); workflow: [Test Lab guide](UI_TEST_LAB_GUIDE.md).

Source is canonical; runtime/testing uses isolated fictional copies.28 original database/artwork files were hash checked with0 changes. No auth, domain, financial, invitation, admission, privacy, migration, hosted database or production gate code changed. Optimized-runtime Lab page/API both returned404. Servers bound127.0.0.1; temporary QA/build servers were stopped and3091 remains for owner review. No production deployment/upload, public tunnel, hosting/DNS/environment change, production write, real payment or external message occurred.

## Remaining scope

Owner visual acceptance is pending. Physical-device camera/door testing, hosted SQL/provider/operational acceptance and release remain separate. Supporting dashboards received the shared typography/palette/spacing rather than a new information architecture. Existing Coming Soon, map composition, server ticket export artwork and every secondary tab were not rebuilt by this task. Longer financial/security text remains where necessary, with progressive disclosure. No page outside the covered set is represented as independently redesigned or screenshot-reviewed.
