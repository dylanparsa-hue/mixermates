# Owner screenshot defect register

The five supplied October 27 screenshots were inspected directly in this conversation. The original files remain on the owner's Desktop. They are defect evidence, not design instructions from third parties.

| ID | Owner evidence | Cause and correction | Evidence / acceptance |
| --- | --- | --- | --- |
| V1 | 10.48.03 PM: Halloween | Legacy `.editorial-visual:after` used theme `--surface`, producing a white haze in light mode; the old grid also retained an empty third column. Replaced the composition with `.mm-halloween`, a full-contrast photo and invariant navy blend. | New desktop/mobile light/dark screenshots; owner visual acceptance pending |
| V2 | 10.48.11 PM: promotional sections | Later CSS removed internal padding while retaining old borders/layout. Replaced the two sections with padded community and photo-led organizer invitations. | New rendered homepage, padding geometry and mobile captures |
| V3 | 10.48.27 PM: map | Old list showed all stored dates and the map dominated. Upcoming uses stored end instants; Kuala Lumpur grouping uses Intl. Map/list is balanced, with a phone view switch and explicit past-event context. | Map captures, filter/history/view interactions and protected-coordinate checks |
| V4 | 10.48.37 PM: community cards | Repeated decorative banners, oversized spacing, inherited `.full` actions and font hierarchy caused cramped wrapping. New compact photo/name rows, actual bio/interests, no repeated decoration, 48px consistent single-line actions; stack at 320px. | Community width/theme captures and actual connect/follow/privacy interactions |
| V5 | 10.48.43 PM: social navigation | Inherited page-tab spacing/underline and search styles competed. New toolbar, semantic keyboard tabs, clear selected state, responsive 2×2 group and real filtered results/empty states. | All four views, search, arrow/Home/End and message tests |

Additional corrections: typography across customer and work surfaces; no hover translation on buttons; no repeated card entrances, parallax or continuous ticker; responsive hero WebP derivatives (original photographs retained); recovery form clears its recovery token after a completed password reset so normal login fields reappear.

The earlier `UI_REDESIGN_REPORT.md` is historical and was rejected. Its “ready to ship” or visual acceptance wording does not apply to this correction. Technical QA, agent visual review and owner visual acceptance are separate decisions.

Independent finish review additionally found mobile Lab context hidden, refunded bookings receiving pending-payment guidance and a split entrance attendance label. All were corrected; targeted phone checks and fresh screenshots passed, and the independent reviewer cleared the scored fixes. The no-pin map explanation was corroborated under Community Friend with zero authorized coordinates; a legitimate Customer booking can authorize its own pin. No privacy rule changed. `ui-correction/finish-qa-results.json` and `FINISH_REVIEW.md` record the qualifications.
