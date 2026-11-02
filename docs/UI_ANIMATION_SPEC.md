# MixerMates motion specification

Authored adaptations of the two inspected references; these numbers are not measurements of Aura source code. No animation dependency was added. CSS, IntersectionObserver, requestAnimationFrame and Web Animations API use the existing React motion module.

| Surface/action | Behavior | Timing |
|---|---|---|
| Hero heading | Two line clip reveals with 18px settling | 720ms, second line +100ms |
| Hero support/actions | Short 12px settling, already-visible default | 800 / 900ms |
| Event highlight | Vertical image reveal | 900ms |
| Hero scroll | Background displacement only, bounded 0–64px | passive scroll, one pending frame |
| Brand band | Seamless horizontal repeating text | 36s linear; visible Pause/Play |
| Cards entering viewport | 22px settling and shallow clip reveal, once | 640ms; 70ms by grid position |
| Card hover | 1.045 image scale and 4px lift | 650ms image; shared control easing |
| Buttons | Short hover lift, immediate pressed feedback | 160–320ms |
| Filters/account dropdown | 6px settling | 220–240ms |
| Page headings | Short settling only, no operational-data delay | 620ms; support +60ms |
| Tabs | Existing measured sliding selection pill | existing transition tokens |
| Dialog/toast/ticket opening | Existing focus-managed enter/exit system | existing shared transition tokens |
| QR fullscreen | No transform, filter or animation | immediate stable scanning surface |

Primary easing is `cubic-bezier(.16,1,.3,1)`. Operational content remains immediately readable; it does not receive the discovery hero treatment. Route changes retain normal navigation and existing page-heading feedback instead of an overlay that blocks input.

## Cleanup and accessibility

Hero disconnects its observer, scroll listener and media listener and cancels its pending frame on unmount. Cards disconnect their observers, cancel Web Animations and release media listeners. Reduced-motion preference stops existing nonessential CSS transitions, the brand band and hero parallax; cards are static if reduction is requested and active card animations are cancelled when it changes. Content is visible without a successful observer callback. No perpetual hidden state is used. The ticker pauses on hover/focus as well as through an explicit keyboard-operable Pause button.

Payment evidence, approval, cancellation, suspension and admission results retain server-defined states. Motion never implies payment success or admission ahead of an authoritative result. The private active QR and fullscreen QR are kept stable; no glare, tilt, ticker, or decoration crosses them.

## Evidence

`docs/ui-redesign/core-ui-results.json` records runtime checks for moving/paused text, scroll response, fine-pointer card zoom and reduced-motion behavior. Existing ticket/entrance rehearsals exercise the real local decoder and authorized admission workflow. Desktop browser emulation is evidence of local software behavior, not physical-phone performance or a real event rehearsal.

## Superseded by the current correction — 28 October 2026

The reveal/parallax/marquee/card-lift schedule above describes the rejected first redesign; do not restore it. Current authority is root `DESIGN.md`, `.impeccable/design.json` and final `app/styles/ui-correction.css`. The correction uses one 480ms opacity/12px opening-heading entrance, 240ms photograph hover, 160ms background/color/border button feedback without movement, static immediately visible cards, and existing short account/filter/tab/dialog/toast state transitions. No hero scroll listener, repeated card observers/Web Animations or continuous marquee is part of the corrected discovery. Reduced motion disables scoped nonessential animation/transitions. Admission QR stays unanimated, untransformed and unfiltered. `UI_PERFORMANCE_RESULTS.md` contains measured local evidence and explicit physical-device/field limits; this documentation refresh did not rerun browser, detector or performance checks and does not establish owner visual acceptance or release authorization.
