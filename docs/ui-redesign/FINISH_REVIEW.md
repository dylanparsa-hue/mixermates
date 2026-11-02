# Independent UI finish review

## Disposition

**FIX — two narrow presentation corrections, then inspect their replacement captures.** The discovery direction is coherent and needs no rebuild. This disposition concerns local UI completion only; it is not release or production authorization.

## Inspected evidence and scope

Visually inspected with `view_image` on 27 October 2026:

- `.impeccable/review/user-{320,375,390,430,768,1024,1440}.png`, plus `mobile.png` and `desktop.png`.
- `docs/ui-redesign/screenshots/hero-light-{390,1440}.png` and `discovery-dark-{390,1440}.png`.
- `profile-light-390.png`, `profile-dark-1440.png`, `event-detail-dark-390.png`, `event-detail-light-1440.png`, `create-light-390.png`, `organizer-overview-dark-1440.png`, `admin-overview-light-390.png`, `customer-payment-upload-light-390.png`, `customer-digital-ticket-dark-390.png`, and `staff-id-acknowledgement-dark-390.png` in that screenshots directory.

All requested captures were present and readable. Fixed mobile navigation appearing partway down full-page captures was interpreted against the actual viewport captures, not treated as a floating-layout defect. Admission/private-code masks were respected.

Read the direction/reference, design-system and motion documents, PRODUCT.md, the four requested design skills, craft-floor, and relevant current CSS/components. Examined accessibility/core runtime result files. Test totals supplied by the build agent are supporting evidence, not independently rerun here. This was a read-only review; no browser, backend, production, or payment action was performed. The fresh remote Web Interface Guidelines were not fetched because the review scope explicitly excluded browsing; this is not a claim of a fresh complete external-guideline audit.

## Direction and usability assessment

The photographic hero, large Oxanium heading and adjacent event poster clearly combine the two pinned references while retaining the official identity. The purple/pink action and navy image shading establish a memorable event product. The 320px composition remains readable, with the map action moving onto a separate line; the tablet layout retains a useful poster and desktop composition. Both themes preserve stable photographic contrast.

Discovery has clear primary actions, searchable/filterable content and scannable event cards. Booking and entrance surfaces use restrained work layouts and explicit authoritative states. The payment page clearly distinguishes evidence submission from confirmed funds. The masked ticket capture shows separate white admission paper; the private decoder tests supplied by the build agent provide scanning evidence, which a masked screenshot cannot establish. No visible clipping, hidden primary action or QR distortion was found in the inspected captures. Motion behavior is supported by the recorded runtime checks and specification; static screenshots alone cannot establish smoothness or physical-device performance.

## Material findings

1. **P2 — redundant decorative eyebrows remain on event detail.** `components/event.tsx:118` (`.detail-section > .eyebrow`) renders “THIS IS YOUR INVITATION”; `components/event.tsx:268` (`.booking-panel > .row.between > .eyebrow`) renders “YOUR NEXT GREAT NIGHT”. Both are visible in `event-detail-light-1440.png`; the former is also visible in `event-detail-dark-390.png`. They add visual noise beside headings that already communicate the sections and violate craft-floor's explicit decorative-eyebrow ban. The actual event date and privacy/status labels convey information and should remain.

2. **P2 — desktop profile badge row retains an old narrow width.** `app/styles/mixermates-ui.css:359`, `.mm-platform .identity-emblems`, changes the old positioned badge cluster to a flex row but does not reset the `width:330px` inherited from `app/styles/mobile-first.css:1646`. `profile-dark-1440.png` shows the three badges wrapping into a small left-hand block, leaving most of that row empty. This reads as a partial layout migration rather than an intentional collection row.

## Concrete fix list

- Delete the two redundant event-detail eyebrow spans; remove/recompose their empty wrapper where needed without altering ticket selection or booking behavior.
- Reset the profile emblem container width to fill the identity sheet (`width:100%` with border-box sizing, or `align-self:stretch; width:auto`) so the existing badges form an intentional desktop row and still wrap safely on phones.
- Replace the affected 390px and 1440px profile/detail captures and inspect them. No additional feature, backend or production work is requested.
