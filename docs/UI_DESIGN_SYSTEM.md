# MixerMates UI system

Scope: the product application behind existing access gates. Coming Soon and original assets remain intact. Canonical CSS: `app/styles/brand-theme.css` for semantic colors; `app/styles/mixermates-ui.css` for application compositions, components, responsive rules and motion. `components/shared.tsx` and `components/motion.tsx` provide reusable UI behavior. No new dependency.

| Role | Dark | Light |
|---|---|---|
| Canvas | #090B18 | #FAFAFF |
| Surface | #101632 | #F5F1FF |
| Elevated/card | #191E3D / #13182F | #FFFFFF |
| Text | #FAFAFF | #17172B |
| Secondary | #B5B4C9 | #625C75 |
| Border | #30354E | #DED8EB |
| Accessible accent | #BBA2FF | #6525CA |
| Selection | #34214D | #E9DCFF |
| Focus | #C6ADFF | #6525CA |

Official identity colors remain #532FEA, #9E1FF0, #ED07FB. The darker action gradient supports white labels; photographs use invariant near-white text over navy shading. Admission QR uses white paper with dark ink. Success, warning and danger retain semantic theme tokens, explicit text and state labels.

## Type and layout

Manrope body, forms, labels and controls; Oxanium discovery, section titles and numeric emphasis. Hero 34–82px, section titles 28–46px, page titles 30–48px, event cards 21–22px, body 14–17px, metadata 11–13px. Headings balance, use line-height 1.02–1.2 and tracking no tighter than -.04em. Work tables use tabular numerals.

8px spacing basis; 16px small gaps, 24px cards, 28px panel padding, 48–104px section rhythm. Gutters 16px at the narrowest phone, 20px on mobile, fluid up to 64px on desktop. Application max content 1360px. Cards 16px, control corners 10px, status corners 6px; capsules are reserved for primary hero actions, navigation and categories.

## Reusable components

- Application header and mobile navigation: same destinations and authorized account menu; active selection uses strong foreground/selection surfaces. Appearance remains in account/footer and profile controls.
- Event cards: separate photograph and content, date badge, category, private access label, city/authorized venue, current tier price, availability and save button. No private address is introduced.
- Search and filters: labelled controls, compact mobile search, expandable additional filters and reset; native selects retained.
- Work surfaces: consistent panels, metrics, readable table rows, horizontal navigation where needed, existing approval/confirmation forms and destructive-action safeguards.
- Booking: distinct tier selection, registration steps, evidence upload, payment review and registration status. Upload does not confirm funds.
- Ticket: navy wallet with white admission paper; original export/privacy behavior; fullscreen QR is untransformed and unanimated.
- Profile/Passport: photographic identity, editable fields and privacy actions, badge controls and actual attendance collection. No attendance is fabricated.
- Feedback: existing announced errors/toasts, focus-managed dialogs, clear empty states and static reduced-motion skeletons.

See UI_ANIMATION_SPEC.md, UI_REDESIGN_REPORT.md and the rendered evidence under `docs/ui-redesign/`. Root DESIGN.md and its Impeccable sidecar are generated from the final built system at handoff.

## Superseded by the current correction — 28 October 2026

The type/composition/motion descriptions above record the rejected first redesign and are historical. Root `DESIGN.md` and `.impeccable/design.json` now document the implemented correction from `brand-theme.css` → `mixermates-ui.css` → final `ui-correction.css`: a full photographic Manrope opening, two-column unboxed discovery, image-to-navy Halloween composition, padded invitations, compact people cards and responsive social/map controls. Oxanium survives only in bounded inherited roles; controls do not move, cards have no repeated entrances, and the marquee/parallax were removed. Preserve theme, privacy, original assets and authoritative operational states. The historical detector has 40 advisories (34 type, six role colors) against the outgoing document; no rerun or clean-result claim accompanies this refresh. See `UI_REFERENCE_COMPARISON.md`, `UI_VISUAL_DEFECT_REGISTER.md`, `UI_PERFORMANCE_RESULTS.md` and `ui-correction/FINISH_REVIEW.md` for actual evidence and limits. Owner visual acceptance and release authorization remain separate.
