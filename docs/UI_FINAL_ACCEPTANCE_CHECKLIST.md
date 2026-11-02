# UI correction acceptance checklist

28 October 2026. Technical QA, agent visual review and owner acceptance are separate decisions.

| Area | Current status | Evidence / limit |
| --- | --- | --- |
| Five supplied screenshot defects | Corrected and visually reviewed | `UI_VISUAL_DEFECT_REGISTER.md`; original screenshots and fresh desktop/phone captures |
| Material composition change | Implemented | Photograph-led opening, large event imagery, integrated navy Halloween, different invitation/community layouts |
| Typography / buttons / spacing | Corrected in reviewed scope | Manrope hierarchy; safe padding; common actions remain single-line; 44px-class touch targets |
| Map and dates | Corrected | Bounded list/map, phone toggle, real stored upcoming dates, labelled history, protected coordinates withheld |
| Light/dark and width coverage | Technical pass | 224 executions across seven widths; actual 390/1440 screenshots inspected |
| Motion and layout | Measured improvement | Development + optimized Chrome 4×CPU samples; reduced motion; no card lifts; no universal fps claim |
| Test Lab one entry / distinct actors | Implemented and exercised | Controller plus six separate identities, rotation/server authorization |
| Event create / submit / review / tier booking | Local pass | Real services and usable forms, fictional database only |
| Evidence → funds → registration → TEST ticket | Local pass | Independent approvals; evidence alone never confirms funds or issues ticket |
| QR / ID / check-in / duplicate / Passport | Local software pass | Actual rendered QR decoded locally; physical camera/device rehearsal remains pending |
| Refund / reschedule / cancellation / local notices | Local pass | Persisted states and original terms; no transfers or external messages |
| Signup / login / recovery / profile / social / support | Local pass | Actual forms and distinct opted-in identities |
| Production guard failures | Local pass | Strict environment/host/marker guards and optimized-runtime 404 checks |
| Original regression suite | Pass | 353 retained tests + three new = 356; original ten browser tests retained |
| TypeScript / schema / optimized build | Pass | Isolated build/test workspaces |
| Independent finish review | See final review | `ui-correction/FINISH_REVIEW.md`; agent review never grants owner acceptance |
| Owner visual acceptance | **PENDING** | Owner must judge the live corrected experience |
| Physical operating / real-event acceptance | **NOT CERTIFIED** | Broader Phase 11 closure remains PARTIAL |
| Production release / real ticket sales | **NOT AUTHORIZED** | No deployment; actual Halloween remains DRAFT/unconfirmed/paused |

Owner rehearsal: open http://localhost:3081/test-lab, use the private local access instructions, then follow `UI_TEST_LAB_GUIDE.md`. Start with the photographic discovery/Halloween/community layouts on a phone, then create a fresh fictional event and follow the separate approval/payment/admission steps. Existing QA history is available in the scenario selector; choose a fresh scenario for a different branch.
