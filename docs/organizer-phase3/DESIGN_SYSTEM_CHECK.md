# Organizer Phase 3 — design system comparison

Checked November 2, 2026 as the documentation handoff for an existing-world **Operate** extension. The owner's four-step/content-first contract supersedes earlier three-step/bank-prerequisite text. This check records evidence and limits; it does not close the whole phase or grant owner visual acceptance.

## Incumbent system and implementation evidence

| Incumbent commitment | Evidence checked | Phase 3 relationship |
| --- | --- | --- |
| Archivo major hierarchy and Manrope task/body copy | `DESIGN.md`; creator/designer CSS; final captures | Creator and event titles inherit `--font-campaign`; step headings and controls retain the body voice. No font replacement. |
| Semantic charcoal Dark and warm neutral Light | `DESIGN.md` frontmatter; `.impeccable/design.json`; `app/styles/cinematic-app.css`; designer CSS | Controls reuse background, foreground, surface, elevated surface, muted text, border and accent roles. Both appearances retain the incumbent task treatment. |
| Compact controls, tonal surfaces and visible state | Creator/designer CSS and source; final editor images | Existing corners/borders remain; selected view controls invert semantic foreground/background. Standard fields/actions retain 48px sizing; rich tools use 44px height and crop sliders remain native. No new elevation or decorative motion system. |
| Mobile-first task work | Four-step source; responsive designer CSS; 390px and 1440px captures | Four desktop progress columns become a two-by-two phone grid. The split workspace becomes one column with Edit/Preview modes. Mobile preview caps at 390px; event content follows its container. |
| Truthful content and image authority | `lib/page-design.ts`; shared renderer; designer/editor source | Independent crops, bounded allowlisted documents and up to eight reorderable sections extend the event feature. Preview booking is disabled. Safe-location/server projection rules remain authoritative. |
| Fixed Phase 2 fee and free same-account creation | Current brief; creator review/ticket copy; `lib/event-wizard-validation.ts`; shared ticket renderer | No subscription/quota or bank prerequisite is restored. Content review is independent of funds readiness. Existing 5% policy and organizer-borne gateway disclosure remain visible. |

Scoped feature controls are not a brand change: `.designed-event` owns Rose/Violet/Ocean/Amber and Plain/Soft choices, with deeper alternate accents in Light. They do not replace application semantic tokens or expand the global identity contract.

The current surface contract is `.impeccable/surfaces/organizer-setup.md`. Source inspected: `components/create-event.tsx`, `components/event-page-designer.tsx`, `components/rich-event-editor.tsx`, `components/event-page-content.tsx`, shared-renderer call sites in `components/event.tsx` and `components/event-setup-preview.tsx`, `lib/page-design.ts`, `lib/event-wizard-validation.ts`, `app/styles/event-designer.css`, `app/styles/event-creator.css`, `app/styles/cinematic-app.css` and import order in `app/globals.css`.

## Render and review evidence

Opened all eight final captures once and confirmed their named mode, appearance and width:

- `.impeccable/review/phase3/final-editor-dark-1440.png`
- `.impeccable/review/phase3/final-editor-light-1440.png`
- `.impeccable/review/phase3/final-preview-dark-1440.png`
- `.impeccable/review/phase3/final-preview-light-1440.png`
- `.impeccable/review/phase3/final-editor-dark-390.png`
- `.impeccable/review/phase3/final-editor-light-390.png`
- `.impeccable/review/phase3/final-preview-dark-390.png`
- `.impeccable/review/phase3/final-preview-light-390.png`

They show the four-step designer, truthful Draft state, original logo and semantic appearance pairing. Phone images show the two-by-two progress grid and independent mode/width controls. Desktop editor and phone preview images show the customer title before TEST/category metadata, consistent with inspected renderer source. Desktop preview's first viewport ends within the banner; it cannot independently establish below-banner title order.

The supplied handoff records one detector result of `[]` and a finish-reviewer **fix** followed by **ship** on the verdict pass: the single scored correction placed category/TEST metadata below the event h1. This supports that fix being resolved, not a new claim that all surfaces or interaction states passed a full final review.

These are first-viewport images, not full-page interaction or screen-reader evidence. This documenter did not rerun a browser, detector, functional tests, production tests or provider tests. Source establishes shared rendering, document bounds and layout intent; it does not prove every runtime privacy/authorization path. Social/friend/block/profile functionality and retired messaging/clubs require separate functional evidence. The captures do not establish every accent's contrast, upload errors, long-content behavior or all keyboard paths. Owner visual acceptance remains separate.

## Preserved files and known stale prose

`DESIGN.md`, `.impeccable/design.json` and `PRODUCT.md` were read and preserved. No source, token, font or asset file was changed by this pass. `PRODUCT.md` retains three-step Phase 1 wording and legacy messaging/footer language. Root `DESIGN.md` and its sidecar still describe the giant decorative footer signature; the creator stylesheet's historical three-step comment also survives. Explicit Phase 3 requirements supersede those task/footer statements. They were reported, not silently repaired or used to restore removed features.

The incumbent two-file token system remains intact. Global regeneration would misrepresent this bounded extension as a new identity and exceed this handoff's write boundary.

## Authorization limit

Local fictional work and isolated QA only, with the specifically authorized sanitized private GitHub source backup. No deployment, public release, production/provider/hosted DB action, environment/hosting/DNS change, tunnel, real funds/sales/admission or external message is authorized by this record. Canonical local data and original assets remain protected. This document does not claim Phase 3 complete or authorize future expansion.
