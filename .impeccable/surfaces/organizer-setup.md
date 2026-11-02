# Organizer event setup

Mode: **Operate**. Existing-world extension under the owner's November 2, 2026 organizer Phase 3 brief. This contract supersedes the historical three-step creator, Tickets bank-readiness prerequisite and earlier lavender/Oxanium guidance. The cinematic identity in `DESIGN.md` and `.impeccable/design.json` remains authoritative. No global identity replacement or owner visual acceptance follows.

Primary targets: `components/create-event.tsx`, `components/event-page-designer.tsx`, `components/rich-event-editor.tsx`, `components/event-page-content.tsx`, `components/event-setup-preview.tsx`, `components/event.tsx`, `app/styles/event-creator.css` and `app/styles/event-designer.css`. Supporting contracts: `lib/event-wizard-validation.ts` and `lib/page-design.ts`. This records the creator/shared customer rendering contract; server authorization and privacy policy remain authoritative.

## Task and progression

Keep exactly four validated steps: **Event Details → Tickets → Design Event Page → Submit for Approval**. The first viewport identifies the task, actual draft state, numbered progression and active screen. Future steps remain disabled until progression is permitted. Save Draft accepts incomplete work; Next validates and persists before advancement. Final submission rechecks content. Keep truthful unsaved, saved, pending and locked feedback, duplicate-submit protection and discard warnings. Account-owned unfinished snapshots remain private and reopenable.

Event Details holds event identity, schedule, access/location and registration configuration. Tickets holds free/paid ticket options, capacity, optional advanced conditions and the existing fixed 5% fee policy. Design Event Page holds artwork, bounded rich content and the customer preview. Submit for Approval presents the final customer rendering, fee disclosure and explicit review action. Do not restore introductory onboarding, separate organizer accounts, plan purchase or URL-editing steps.

Content submission is independent of bank, recipient and payment readiness. No bank account is required to design or submit a paid event for independent content review. Entry/cancellation conditions and valid ticket configuration still matter. Content approval does not authorize actual funds, sales or admission; funds and real-sales guards remain independent.

## Layout and visual system

Use incumbent semantic background, foreground, surface, elevated surface, muted text, border and accent roles in both appearances. Archivo carries major page/event hierarchy; Manrope carries controls, document body, labels and operating detail. Preserve the official logo, Light/Dark/System resolution and stored appearance. Work panels use quiet tonal layering and compact corners.

The normal task area caps at 1000px; the designer expands the creator to 1440px. Desktop uses four progress columns and a controls/preview workspace with a 300–380px control column and flexible customer rendering. At 767px and below, progress becomes a two-by-two grid and the workspace becomes one column. Edit hides the embedded preview on phones; Preview shows the customer rendering. Desktop/Mobile preview-width controls are separate from Edit/Preview mode; a Mobile preview caps at 390px. Event content responds to its actual container width.

Retain visible labels, linked errors, invalid states, visible keyboard focus and recovery to the first invalid control/disclosure. Standard creator fields and main actions remain at least 48px high. Rich formatting tools use their implemented 44px minimum height; crop sliders retain native range interaction. These rules and screenshots do not constitute a complete accessibility audit.

## Designer and customer rendering

Banner and poster are independently uploaded, replaced, removed and cropped. Recommend **1440 × 450px** banner and **425 × 601px** poster; accept JPG/PNG/WebP up to 4MB through the guarded media path. Each has horizontal/vertical position (0–100) and zoom (1–3); changing one crop does not alter the other. The banner may fall back to the poster when no separate banner exists.

The document editor supports paragraphs, headings/subheadings, bold/italic, lists, links, uploaded images, alignment and undo/redo. It stores an allowlisted document tree rather than arbitrary HTML, CSS or scripts. Server parsing bounds size/nesting, links and image sources. Additional titled sections can be added, reordered with named up/down buttons and removed; at most eight are allowed. Mandatory entry, registration and fee disclosures remain outside those optional sections.

Rose, Violet, Ocean and Amber accents plus Plain/Soft backgrounds are bounded event-page controls. They scope to the designed event; theme-specific accent variants retain Light/Dark readability. They are not global brand tokens or a new palette authority.

`EventPageContent` serves the live designer, final review, saved preview and designed customer route. Preserve the title as the leading hierarchy, with TEST/category metadata below it. Preview uses current artwork, crops, rich sections, schedule, safe location, organizer identity, tickets and fee policy. Description/Tickets tabs and ticket selection remain interactive; preview booking is disabled and creates no reservation or payment. Saved new-tab preview requires persisted data. Preserve public/private projections; never expose exact private addresses through preview or decorative content.

## Adjacent product constraints

Free organizer capabilities extend the existing eligible customer identity, retaining tickets, friends and settings. Automatic organizer/event URLs remain stable. Studio retains four primary tasks and authorized selected-event controls. Preserve the Phase 2 fixed 5% discounted-face-value model, absorb/customer-paid choice, immutable booking snapshots, free-ticket exemption and organizer-borne gateway charges. Direct QR receivables must not imply platform collection.

Phase 3 includes functional friends, blocking and profile privacy while retiring messaging/clubs, and explicitly removes the giant footer lettering. These owner decisions supersede legacy product/footer prose without authorizing unrelated token changes. Coming Soon protections, original assets, private receipts/tickets and authorization stay intact.

## Evidence and limits

System comparison: `docs/organizer-phase3/DESIGN_SYSTEM_CHECK.md`. Final captures: `.impeccable/review/phase3/final-{editor,preview}-{dark,light}-{1440,390}.png`. The eight images show the designer at desktop/phone widths in both appearances. They are first-viewport evidence, not proof of every lower-page interaction or unrelated social/profile state. Source comparison confirms four steps and shared rendering; runtime/security evidence belongs in Phase 3 implementation/QA records.

The handoff reports one detector run with `[]`, a reviewer **fix** disposition and a **ship** verdict pass scoring the single title/metadata-order correction resolved. That verdict is limited to the scored correction; it is not whole-application or owner acceptance.

Local fictional work and isolated QA only. A sanitized private GitHub source backup is specifically authorized; it grants no deployment authority. No Hostinger deployment, production/provider/hosted DB access or writes, infrastructure/environment change, public tunnel, real payments/sales/admission or external messages follows. Preserve canonical local data and original assets. Future release and expansion require their own scope.
