---
name: MixerMates
description: Cinematic nightlife discovery with expanded campaign typography, photographic posters and charcoal task surfaces.
colors:
  dark-background: "#080909"
  dark-foreground: "#ffffff"
  dark-surface: "#111314"
  dark-elevated: "#1c1f20"
  dark-border: "#303436"
  dark-secondary: "#a6a9ad"
  dark-accent: "#ff6875"
  dark-focus: "#ff8b67"
  dark-selection: "#6b2338"
  light-background: "#f8f7f5"
  light-foreground: "#18191a"
  light-surface: "#eeedeb"
  light-elevated: "#ffffff"
  light-border: "#d4d3d1"
  light-muted: "#e8e6e4"
  light-secondary: "#626365"
  light-accent: "#b61938"
  light-selection: "#f9d8df"
  campaign-red: "#f22b38"
  campaign-orange: "#ff681c"
  campaign-magenta: "#e5005b"
  campaign-plum: "#32203e"
  action-start: "#c91e38"
  action-end: "#c41250"
  action-hover: "#aa1638"
  hero-cta-ink: "#111111"
  hero-cta-hover: "#ffd4cc"
  hero-light-cta: "#b61938"
  hero-light-cta-hover: "#92112c"
  on-photo: "#ffffff"
  ticket-paper: "#ffffff"
  ticket-ink: "#141519"
  ticket-muted: "#646770"
  ticket-line: "#e0e0e4"
typography:
  hero: {fontFamily: "Archivo, sans-serif", fontSize: "clamp(58px, 7vw, 100px)", fontWeight: 900, lineHeight: 0.88, letterSpacing: "-0.035em", fontVariation: "'wdth' 125"}
  hero-phone: {fontFamily: "Archivo, sans-serif", fontSize: "clamp(36px, 9.6vw, 58px)", fontWeight: 900, lineHeight: 0.96, letterSpacing: "-0.03em", fontVariation: "'wdth' 125"}
  editorial: {fontFamily: "Archivo, sans-serif", fontSize: "clamp(40px, 5.5vw, 80px)", fontWeight: 900, lineHeight: 0.96, letterSpacing: "-0.035em", fontVariation: "'wdth' 120"}
  row-heading: {fontFamily: "Archivo, sans-serif", fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 850, lineHeight: 1.12, letterSpacing: "-0.025em", fontVariation: "'wdth' 112"}
  detail-heading: {fontFamily: "Archivo, sans-serif", fontSize: "clamp(28px, 3.2vw, 44px)", fontWeight: 850, lineHeight: 1.12, letterSpacing: "-0.03em"}
  task-heading: {fontFamily: "Archivo, sans-serif", fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 850, lineHeight: 1.2, letterSpacing: "-0.03em"}
  poster-title: {fontFamily: "Manrope, sans-serif", fontSize: "16px", fontWeight: 750, lineHeight: 1.4, letterSpacing: "-0.015em"}
  body: {fontFamily: "Manrope, Arial, sans-serif", fontSize: "15px", lineHeight: 1.6}
  button: {fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700}
  footer-signature: {fontFamily: "Archivo, sans-serif", fontSize: "clamp(36px, 12.2vw, 190px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", fontVariation: "'wdth' 100"}
rounded:
  nav-link: "4px"
  small-control: "6px"
  control: "8px"
  compact-photo: "10px"
  photo-panel: "12px"
  detail-phone: "16px"
  campaign: "20px"
  admission: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  phone-gutter: "20px"
  lg: "24px"
  task-panel: "32px"
  xl: "32px"
  campaign-padding: "48px"
  phone-section: "52px"
  desktop-section: "88px"
  desktop-gutter: "clamp(24px, 4vw, 56px)"
components:
  button-primary: {textColor: "{colors.on-photo}", typography: "{typography.button}", rounded: "{rounded.control}", padding: "12px 20px", height: "48px"}
  button-primary-hover: {backgroundColor: "{colors.action-hover}"}
  button-hero: {backgroundColor: "{colors.on-photo}", textColor: "{colors.hero-cta-ink}", rounded: "{rounded.control}", padding: "12px 24px", height: "48px"}
  button-hero-hover: {backgroundColor: "{colors.hero-cta-hover}"}
  button-secondary-dark: {backgroundColor: "{colors.dark-elevated}", textColor: "{colors.dark-foreground}", typography: "{typography.button}", rounded: "{rounded.control}", padding: "12px 20px"}
  search-dark: {backgroundColor: "{colors.dark-surface}", textColor: "{colors.dark-foreground}", rounded: "{rounded.control}", padding: "8px", height: "60px"}
  chip-dark: {backgroundColor: "{colors.dark-surface}", textColor: "{colors.dark-foreground}", rounded: "{rounded.pill}", padding: "6px 18px 6px 7px", height: "58px"}
  chip-selected-dark: {backgroundColor: "{colors.dark-foreground}", textColor: "{colors.dark-background}"}
  booking-panel-dark: {backgroundColor: "{colors.dark-surface}", textColor: "{colors.dark-foreground}", rounded: "{rounded.photo-panel}", padding: "28px"}
  admission-paper: {backgroundColor: "{colors.ticket-paper}", textColor: "{colors.ticket-ink}", rounded: "{rounded.admission}", padding: "24px"}
---

# Design System: MixerMates

## Overview

**Creative North Star: "Your Next Night"**

An energetic, photographic nightlife world combines near-black space, expanded white campaign headlines, warm circular portrait art and saturated editorial gradients. Actual event posters carry discovery; charcoal task surfaces keep booking, tickets, profiles and operating work readable. The official connected M symbol and original purple-to-pink logo remain supplied artwork.

The owner's October 28 video replacement brief supersedes the previous neutral catalogue direction. This document records the implemented local system, not owner visual acceptance. The normative application cascade ends in `app/styles/cinematic-app.css`, imported after the supporting styles by `app/globals.css`. Covered application and customer shells share these tokens; supporting routes retain their existing information architecture. Coming Soon presentation and guards remain unchanged.

**Key Characteristics:**
- Dramatic portrait/disc hero and expanded Archivo campaign typography.
- Two photo-chip strips and native horizontal portrait-poster discovery.
- Magenta organizer editorial, plum reminder, red fan campaign and gradient footer signature.
- Manrope controls, charcoal task surfaces and intentional alternate light roles.
- Actual authorized data and stable white, private admission paper.

## Colors

### Primary

Coral and warm focus roles identify interactive emphasis on dark task surfaces. Dark primary actions use the implemented red-to-raspberry gradient; the inherited higher-specificity light rule resolves the same action variable to a solid dark-ink gradient. Hover resolves to the deeper action color. The hero CTA uses white with dark ink in Dark appearance, and deep red with white ink in Light appearance.

### Secondary

Warm red and orange form the hero disc. Magenta powers the creator editorial; plum contains the reminder; red-brown shading supports the organizer fan. Gradients are part of this visual world. Their exact composite definitions, signature-only colors and chip-border treatments live in the sidecar snippets and source CSS; these do not create additional general task-UI roles. The footer's red-pink signature is decorative typography, separate from the official logo.

### Neutral

The dark foundation progresses from black canvas to charcoal surface and elevated charcoal. Secondary text and borders use their named roles. Light appearance maps task UI to warm off-white, white panels, dark ink and a deeper red accent; campaign art retains its photographic contrast. Admission paper, ink, muted copy and perforation line remain invariant in both themes.

**The Theme Role Rule.** Use live semantic variables for task surfaces and controls. Retain Light/Dark/System, stored preferences and the existing system-preference resolution; this redesign does not establish a new automatic dark default.

## Typography

**Display Font:** self-hosted Archivo, through `--font-campaign`, with sans-serif fallback. The variable font is bundled under the SIL Open Font License.

**Body Font:** self-hosted Manrope, through `--font-body`, with Arial/sans-serif fallback. Original logo typography remains artwork; retained Oxanium supports untouched historical/Coming Soon contexts.

Expanded heavy Archivo carries campaign scale; compact Manrope carries useful data and interaction. The frontmatter records the implemented reusable roles. Hero and row headings use uppercase display copy; event titles retain their actual case. Editorial phone headings use a smaller responsive ramp; poster titles reduce to 15px, row headings to 20px and narrow-phone headings to 18px. Inputs remain 16px. Metadata uses 11–13px; primary navigation uses 12px. Footer signature reduces to 11.4vw on phones.

**The Two Voices Rule.** Use Archivo for campaign and major page hierarchy; use Manrope for controls, descriptions, poster captions and operational detail. Preserve original logos and event artwork rather than recreating their type.

## Layout

Mobile is primary. Application content caps at 1320px, with the fluid gutter token; phone gutters become 20px at 767px and below, then 16px at 360px and below. Existing customer flow widths and route-specific grids remain. The header is a compact elevated charcoal bar. At 768px and above, its official brand is centered independently of asymmetric left/right controls. Phone header simplifies to brand and account actions; bottom navigation retains safe-area-aware spacing.

Discovery opens with the centered disc/portrait hero and stacked headline, followed by two horizontally scrollable photographic category strips. Poster tracks use `calc((100% - 72px) / 4.12)` columns and 24px gaps on desktop, 35% columns at 1023px and below, and 74% columns with 16px gaps at 767px and below. Each poster has a 3:4 image and a caption below. Native overflow and scroll snap preserve touch, trackpad and keyboard browsing. Phone layout exposes the next poster rather than shrinking a four-column grid.

Desktop creator editorial pairs large copy and an offset two-column mosaic. Phone copy precedes a native horizontal mosaic with 62% tiles. Reminder photos frame centered copy on desktop and sit below it on phones. The organizer fan preserves its deliberate rotations while shrinking. Section separation uses the desktop/phone section tokens rather than extra framed wrappers. The footer becomes stacked link columns with bottom-navigation clearance.

Detail retains a photo cover, readable content and existing booking flow. Its desktop cover is 510px high, phone cover 360px; phone detail title is 32px. Booking, ticket, profile and operating interfaces share the visual tokens, without a new backend or wholesale per-page information architecture.

## Elevation & Depth

Depth combines layered portrait art, soft local gradients, image shading and tonal surfaces. Poster cards and work panels are shadowless at rest. The hero headline uses a soft `0 3px 24px #0002` shadow; fan tiles use `0 8px 24px #0004`; phone navigation uses `0 6px 24px #0002`. Inherited menu/dialog depth remains local to overlays; ticket dialogs use `0 24px 80px #0005`.

Motion is bounded and functional: 200ms control color changes, a 220ms poster hover scale to 1.035 on hover-capable devices, brief 400–650ms hero entrances, and one-time 500ms collage reveals. Reveals use an IntersectionObserver that disconnects once visible. Poster arrows use native scrolling; no scroll interception or perpetual animation is introduced. Reduced motion removes discovery animation, transitions, hover transforms and smooth scrolling. QR presentation remains still.

## Shapes

Controls and fields use compact corners; small navigation actions use the smaller control role. Poster art, booking surfaces and customer cards use the photo-panel role. Creator/reminder images use compact photo corners; full promotional containers use the larger campaign role, reducing to photo-panel corners on phones. Category chips are capsules with circular photographic thumbnails. The hero disc and rings provide the large circular geometry. Ticket paper retains its admission corner role and dashed perforation independently of its QR.

## Components

### Buttons

Primary actions use the action variable (red-to-raspberry on dark; solid dark ink on light), white labels, compact corners and at least 48px height. Hero action uses white in Dark and deep red in Light; secondary actions use elevated semantic surfaces and a border. Controls retain visible focus rings and disabled native behavior. Use explicit pending, error, approval and availability text from actual state.

### Inputs / Fields

Inputs use semantic background/text/border roles and compact corners. Discovery search is a shared charcoal row, 60px minimum height on desktop and 56px on phones, with a 16px field, real filter action and optional submit control. Phone filter keeps its icon and accessible name while hiding the text label. Existing visible labels, keyboard focus and truthful empty/filter outcomes remain.

### Chips and navigation

Category chips include actual configured category images and names, varied fine color borders and inverted selected contrast. Desktop chips are 58px minimum height; phones use 50px with smaller thumbnails. Both rows scroll naturally. Desktop current navigation uses an accent underline; phone current navigation inverts foreground/background. Preserve accessible names, current/selected states, skip links and authorized destinations.

### Cards / Containers

Poster art has a date badge, local shading, category text and a separate save control; captions show actual title, location and price/availability information. Work panels, summaries and profile containers use semantic charcoal/light roles without decorative campaign repetition. Public organizer tiles use only eligible public event projections: an actual organizer photo where supplied, otherwise clearly described event artwork. Their links lead to the eligible event.

### Campaign compositions and footer

The hero layers the original generated alpha portrait, feathered within its correct intrinsic image box, over a warm disc, faint rings and restrained warm ambient depth. The magenta editorial uses the truthful organizer mosaic. Plum reminder uses atmospheric side photographs, ticket and notification-preference destinations. The red organizer campaign uses a five-image fan and actual event-creation destination. Footer links remain real application routes; Booking terms opens the existing accessible booking/payment information dialog. The giant gradient MIXERMATES signature is decorative and hidden from assistive technology. Asset provenance is recorded in `docs/cinematic-ui/ASSETS.md`.

### Detail, booking and admission

Detail, checkout and profile headings adopt Archivo while task copy and controls retain Manrope. Booking panels and customer cards use quiet semantic surfaces. Tickets combine authorized artwork, actual holder/tier/date/location/status and white paper. The existing secure QR stays 200px square, white, private, unfiltered and untransformed. Existing reveal, fullscreen, safe-share and authorization behavior remain authoritative; styling never grants access.

## Do's and Don'ts

### Do:

- **Do** preserve official logo artwork, original assets and protected media.
- **Do** use the expressive campaign language for discovery and quieter shared tokens for task work.
- **Do** retain native scrolling, visible keyboard focus, reduced-motion behavior and phone safe-area spacing.
- **Do** display actual authorized event data; clearly mark fictional local Lab content TEST.
- **Do** keep admission QR white, private, static and scannable.

### Don't:

- **Don't** restore the rejected lavender panels or obsolete catalogue-only direction.
- **Don't** fabricate availability, price, verification, attendance, financial state or social proof.
- **Don't** reinterpret event artwork as a named organizer portrait or expose private venue/profile data.
- **Don't** change Coming Soon protections, stored theme preferences or backend authorization through visual work.
- **Don't** treat local implementation, screenshots or this document as owner visual acceptance or production/release/sales authorization.


## Critical correction — 28 October 2026

The current owner brief removes both hero side shapes and supersedes permanent dark feature panels in Light appearance. Feature background, ink, secondary copy and button roles resolve semantically: warm pale editorial, pale plum reminder and pale warm organizer campaign in Light; rich dark campaign grounds in Dark. Photography retains its own white-on-photo overlays. The subsequent owner follow-up explicitly adapts the hero to Light: warm off-white canvas, dark ink, pale red rings and a deep red CTA. Desktop separates the left-aligned headline from the portrait/disc on the right; below 768px the portrait sits above the centered headline. Theme-specific feathering keeps the portrait’s lower edges soft against the pale canvas. Dark retains the original layered, white-headline composition. Shared application icon hover uses semantic ink, including in Light.

Native category rails start with full first chips, 20–24px insets and an 18px edge mask, and support Home/End/arrow focus. Page gutters are 16–20px on phones and fluid 24–56px on desktop; task padding is 20px on phones and 32px on desktop, with 28px booking panels. Event details use restrained 28–44px wrapping titles. Phone ordering places ticket selection after the description and before secondary facts. No actual event name is rewritten.

Profile appearance uses icon radios with 44px targets, accessible names, native tooltips and a selected state. Profile and notification panels dismiss outside, on Escape, navigation or mutual opening, without persistent overlays. Notifications remain accessible on phones.

Organizer primary navigation is My events / Payments / Scanner / Event settings, with compact actual metrics and event-context actions. Admin primary navigation is Overview / Events / Accounts / Payments & sales / More. Advanced services remain available contextually. One identity can hold customer and organizer capabilities; privileged administrative authority stays separately granted. The local workspace chooser uses distinct fictional reviewers where independence is required.

Current correction evidence and acceptance limits are in docs/CRITICAL_UI_FIXES_REPORT.md and docs/ui-fixes/. The owner has not visually accepted this result. No release or real-sales authority follows from these records.


## Light hero follow-up — 28 October 2026

The owner requested that Light appearance also apply to the hero. Hero background, foreground, supporting text, rings, title shadow and CTA states now have semantic roles. Light uses the existing #f8f7f5 canvas, #18191a ink, #626365 secondary text, #b61938 action and #92112c hover. The original portrait, warm disc, campaign face and copy remain. No new image, JavaScript, animation, theme persistence behavior or backend change was introduced. Focused rendered evidence is in docs/light-hero/.

## Appearance transition — 28 October 2026

Changing the resolved application appearance uses a brief original-logo curtain to conceal the two hero compositions. The fixed charcoal #111314 surface fades in over 160ms; the theme commits only under full opacity, followed by a short hold and fade-out within 520ms. Opacity is the only animated property. The cover is decorative and retains keyboard focus. Interrupted changes preserve the latest preference and clear the cover. Reduced motion, initial appearance, same-color selections, Coming Soon and missing/failed animation support apply directly. No perpetual animation or startup loading screen. Evidence: docs/theme-transition/.


## Free creation and ticket fees — 2 November 2026

The owner's Phase 2 brief retires the previous subscription pricing section, upgrade forms and Studio quota panel. Keep the cinematic discovery campaign and free same-account Create Event entry. Operate surfaces retain the existing semantic Light/Dark tokens, Archivo page hierarchy, Manrope controls and phone-first spacing.

Tickets adds one native radio group: **Who pays the 5% MixerMates fee?** Organizer absorbs it / Customer pays it. Show an immediate per-ticket definition-list preview, with actual discounted face value, platform fee, customer total, organizer amount before gateway charges and an explicitly unknown gateway fee. Free tickets have no percentage charge. Fee policy locks after a booking and remains visible in Event overview/Tickets. Checkout uses the same restrained breakdown plus a server quote before confirmation; saved booking views show their immutable original price.

Payments leads with paid tickets, face value, absorbed/passed fees and commission owed/collected/outstanding. Gateway costs, organizer estimates and refunds use a named disclosure. Empty real-transaction scopes get a concise truthful empty state. Fictional transactions are explicitly TEST, never combined with real balances. Event summaries and Review QR Payments retain authorized context. The review action filters pending manual QR rows before pagination; the all-payments/registrations view remains available. Preserve evidence privacy, independent funds/registration checks, audit access, ticket issuance and admission protections. No collection, revenue or settlement is invented.

Verification: docs/organizer-phase2/. Owner visual acceptance and production authorization remain separate. This precise existing-surface extension adds no new campaign art, font, palette or decorative motion.
