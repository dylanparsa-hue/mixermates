# MixerMates UI redesign acceptance checklist

Local UI scope only. This does not replace the 309-item product feature checklist or confer release/real-event readiness.

## Direction and implementation

- [x] Both exact Aura links inspected visually in authenticated Chrome; responsive previews and accessible interactions used read-only.
- [x] Honest observation limits and adaptation plan documented.
- [x] Official logo, Manrope/Oxanium and existing navy/purple/violet/pink identity retained.
- [x] New application composition and shared component/motion tokens implemented without new dependencies.
- [x] Discovery photographic hero, configured event highlight, moving band, search/date/category controls and event cards.
- [x] Event detail presentation, existing rules, tiers, host and authorization-aware venue information retained.
- [x] Booking/registration, organizer payment instructions, proof upload and independently reviewed status remain distinct.
- [x] Ticket wallet refreshed; active QR and fullscreen QR stable, private and high contrast.
- [x] Profile, editable fields, privacy controls, social actions, badge controls and real attendance Passport preserved.
- [x] Organizer/admin navigation, panels, tables, review forms and feedback share the system.
- [x] Guest lists, entrance, scanner, financial/support/notification operations retain their actions and server-defined states.
- [x] Empty/error/loading, focus and reduced-motion states included.

## Verification

- [x] Unchanged 353-test Node suite passes on baseline and redesigned source in isolated fictional workspaces.
- [x] 320/375/390/430/768/1024/1440 widths in both light and dark modes checked across the recorded surface/state matrix.
- [x] Core motion, pause control, search empty/reset, filters and account navigation exercised.
- [x] Fictional invitation → registration → proof → independent review → ticket → authorized entrance exercised.
- [x] Rendered private QR decoded locally at all seven widths; content kept only in memory and masked in saved ticket captures.
- [x] Accessibility checks: named controls, touch targets, focus, announced error and 13 representative surfaces.
- [x] Typecheck, Prisma validation and optimized webpack build.
- [x] Fresh independent visual review; two narrow corrections applied and recaptured for verdict.

## Safety and honest limits

- [x] Protected backend, tests, schemas/migrations, original assets and canonical database hash comparison.
- [x] Loopback servers and separate fictional databases; real sales/customer access gates preserved.
- [x] No production/Hostinger access, deployment, upload, push, tunnel, real funds or external message.
- [x] No next backend phase started.
- [ ] Physical-phone camera/scanner and real venue rehearsal: outside this local redesign; not claimed.
- [ ] Production release, real customer access or ticket sales: not authorized.

Final quantitative results and independent verdict are in UI_REDESIGN_REPORT.md. Evidence is under `docs/ui-redesign/`.
