# Ticketmelon organizer audit — 1 November 2026

Research completed before creator implementation. Functional reference only; no branding, wording, images or proprietary code copied.

## Evidence and boundaries

**Live:** authenticated owner's existing Chrome session, using supported native accessibility controls. Inspected customer “Event Organizer” entry → organizer inventory → blank Individual/Company onboarding; existing organizer settings and existing draft read-only; new-event form; event details/date editor; ticket add form; design page; registration/question editor; advanced settings; overview/breakdown; sales trends; buyer/web analytics; Orders/Tickets; promo creation; affiliate inventory; gate-agent form and scan logs. Expanded nested menus and the category/currency/question dropdowns. No cookies/passwords accessed. No organizer/event/ticket/promo/staff record created, saved, published, deleted or submitted. Unsaved form exploration was abandoned. No invitation, purchase, payout, legal acceptance or bank/identity data submission.

**Docs:** official [organizer index](https://organizer.ticketmelon.com/event-organizers), [event creation](https://organizer.ticketmelon.com/help-center/how-to-create-a-new-event), [details](https://organizer.ticketmelon.com/help-center/how-to-fill-out-new-event-details), [ticket types](https://organizer.ticketmelon.com/help-center/how-to-create-ticket-type), [advanced settings](https://organizer.ticketmelon.com/help-center/how-to-set-up-advanced-setting), [profile/team](https://organizer.ticketmelon.com/help-center/how-to-edit-an-organizer-profile), [publishing](https://organizer.ticketmelon.com/help-center/how-to-publish-event), [exports](https://organizer.ticketmelon.com/help-center/how-to-export-data), [sales](https://organizer.ticketmelon.com/help-center/how-to-view-sales-breakdown-and-request-payout), [analytics](https://organizer.ticketmelon.com/help-center/how-to-view-analytics), [promos](https://organizer.ticketmelon.com/help-center/how-to-create-promo-codes), [gate agent](https://organizer.ticketmelon.com/help-center/how-to-create-a-gate-agent-user).

No real attendee/order data was needed. Financial rows were empty. Publishing behavior after submission, actual error responses for uploads, crop editor, online/private location behavior, complete age/timezone menus, cancellation workflow and real scanner app were **not exercised**; do not infer their behavior. Help articles have screenshot-heavy content; prose alone is not evidence of unlisted options. Matrix describes the visible reference, not undocumented capabilities.

Classification: **E** essential; **A** optional/advanced; **X** irrelevant to this model. MixerMates baseline: **I** implemented; **P** partial; **M** missing; **B** broken. Status is the source audit before Phase 1 edits. Follow-up implementation is recorded separately in ORGANIZER_PHASE_1_REPORT.md.

## Workflow inventory and feature matrix

| Area | Observed Ticketmelon option or behavior | Class | MixerMates baseline / disposition |
|---|---|---|---|
| Entry | Customer header opens organizer manager with same authenticated account | E | P — capability exists; customer meets paid plan screen |
| Profiles | Search organizer, Add Organizer, profile switch, multiple profiles, per-profile event list | X | I — event owner already User; retain one identity |
| Onboarding | Individual / Company radio; organizer name*, permanent URL*, phone*; optional newsletter; required terms/privacy acceptance | E | P — remove second onboarding/URL/phone questions; adult/account policy remains |
| Profile | Organizer name*, logo upload; fixed organizer URL; view public profile | E | M — automatic stable readable organizer route |
| Logo | PNG/JPG, 400×400 recommended bound, ≤1 MB | A | I — existing account photo; do not require another logo |
| Social | Facebook, email, website http/https, Instagram, X, YouTube, LINE ID, TikTok | A | P — account bio/website/Instagram already; no repeated creator questions |
| Description | No organizer-description field observed in current profile screen | A | I — existing account bio; reference not assumed |
| Business | Individual full name/ID or company name/registration number; phone; country Thailand/Other; address, province/district/subdistrict/ZIP | A | I — recipient verification separate from creator; never fake identity |
| Documents | ID/passport*, company registration*, VAT certificate*; PNG/JPG/PDF ≤5 MB | A | P — existing separate verification; not copied into event wizard |
| Payout | Bank account inventory; country*, bank*, account number*, holder*, branch*, nickname; default account checkbox | X | I — organizer-direct approved recipient system; no central payout replacement |
| Teams | Invite email; Select All or organizer management, overview/payout, orders, edit event, marketing, seat map, attendees permissions | A | I — scoped event staff; no admin self-grant, no invitations sent |
| Events list | Search, status dropdown, draft badge, dates/location, edit/delete actions, Create Event | E | I — existing drafts/status/actions; deletion not exercised |
| Wizard | Event details first; ticket/design/form/advanced links disabled until initial save; Save & Continue; Cancel | E | B — existing seven steps clickable without validation |
| Name/URL | Event name*, manual event URL* beneath organizer prefix; URL instructions | E | P — auto event slug exists but long UUID suffix; remove manual URL need |
| Categories | Arts, Business, Education, Charity & Causes, Fashion, Film & Media, Government, Health, Hobbies, Lifestyle, Nightlife, Music, Science & Tech, Sports & Fitness, Travel & Outdoor, Voucher | E | I — retain MixerMates event categories |
| Tags | Search-keyword input | A | P — existing genre/subcategory; no standalone tagging service |
| Currency | THB, PHP, MYR, SGD, USD, VND, EUR, IDR, AUD, TWD, HKD; existing draft currency locked | X | I — MYR pricing retained |
| Age | Default no age restriction; selectable control | A | I — minimum age, ID checks; entire menu not recorded |
| Dates | Timezone*; start/end date* and hour/minute*; edit/delete date; Add Date and Time; hide event dates checkbox | E/A | P — one date range/timezone supported; multiple sessions missing |
| Timezone | Searchable timezone selector; existing draft Bangkok GMT+7 | E | I — validated IANA zone with zoned storage; use browser local default |
| Location | Venue / To be announced labels, Google Maps search*, location name*, optional detail; street/satellite/fullscreen/map controls | E | I — venue/private address/approximate coordinates; no Google requirement |
| Online/private | No online/private selector established in inspected screens | E | I — PUBLIC/PRIVATE/INVITATION_ONLY and hidden location already exist |
| Rich text | Bold, italic, underline, strike; font/size, text/background color, align, lists, indent, quote, links, image, video, table, emoji, rule, undo/redo, select all, clear formatting, code view | A | P — safe plain text retained, no arbitrary HTML/embeds |
| Description | Counter to 50,000 characters; up to 50 images, ≤4 MB each | E/A | I — short description + bounded 6,000-character detail, optional gallery |
| Back/save | Cancel and Save & Continue visible; inline required message on category blur | E | B — incomplete draft supported but navigation ignores validity |
| Publish | Request to Publish; docs say edits locked while review pending until draft/approval | E | I — submit + independent admin review, sales separately gated |
| Preview | Go to Event Page; Design Page Preview | E | I — authenticated saved preview; no real checkout exercised |
| Artwork | Main poster recommended 425×601 JPG/PNG ≤4 MB | E | I — validated PNG/JPG/WebP ≤4 MB, owner-bound upload |
| Banner | Separate event banner recommended 1440×450 JPG/PNG ≤10 MB | A | M — gallery exists; separate banner field missing |
| Placement | Banner at top; poster next to title/date/location/age/Get Tickets; description/ticket tabs | E | P — public detail uses poster as cover; add banner with poster fallback |
| Styling | Text/background editor colors; page styling icon visible but exact controls not established | A | I — existing visual presets; no copied theme/branding |
| Crop/errors | Upload actions visible; actual crop modal and rejection states not exercised | A | P — no existing crop UI; implement only if safe within current pipeline |
| Ticket tiers | Section group, Add Tickets, Create New Section; name*, quantity*, optional ticket description/image | E/A | I — up to 10 tiers; section grouping/images optional deferred |
| Free/paid | Price field accepts nonnegative value; no distinct free toggle inspected | E | I — zero-priced and paid tiers supported; expose clear choice |
| Sessions | Apply Entry Date to* selector for event date(s) | A | M — multi-session model absent; defer explicitly |
| Sales period | Required sale start/end date and time; sale ends at entry end checkbox | A | I — optional sale windows; preserve current pre-event restriction |
| Fee settings | VAT checkbox; percentage/fixed pass-on vs absorb; gateway pass-on/absorb; fee totals | X | I — preserve fee services; new 5% system belongs to Phase 2 |
| Order limits | Minimum and maximum tickets per order | E/A | I — min/max supported, bounds 1–10 |
| Visibility | Available/Unavailable; Show ticket on event page; Show remaining ticket | A | P — AVAILABLE/HIDDEN/PAUSED supported; no fabricated remaining counts |
| Ordering | Ticket sections and section action buttons visible; drag reorder not verified | A | I — existing sort order; expose move actions |
| Registration | Form name*, once per order / each ticket; ticket-type applicability; active state; name/data printed on tickets; preview | A | I — event registration definitions; privacy controls retained |
| Questions | Required, optional description, image/link options; short answer, paragraph, choice, multiple choice, dropdown, country, nationality, date, time, number, phone; max characters | A | P — current bounded question types; retain advanced existing editor |
| Discovery visibility | Show on website / app; help says hiding discovery leaves URL accessible | A | I — MixerMates private access is authorization, not just unlisting |
| Refund policy | Allow/disallow buyer requests; policy rich text | E/A | I — existing refund services and policy protections; do not copy legal terms |
| Disclaimer | Custom title/description with rich text | A | I — existing event policies/entry requirements |
| Overview | Draft badge; refresh/export report; net payout; total sold/capacity; average/order; scan rate; Paid/Pending/Generated/Available breakdown; tier status | E | I — actual booking/payment/attendance summaries; no payout claims |
| Breakdown | Gross ticket sales, platform fee incl VAT, gateway fee incl VAT, net payout; Request Payout action | A/X | I — direct-payment reporting, financial review kept separate |
| Sales trends | Daily unit/gross table and graph; timeframe controls | A | P — current operating analytics; no invented traffic |
| Buyer analytics | Gender, age group, top buyer countries | X | P — minimize sensitive analytics; retain legitimate aggregates only |
| Web analytics | Views, visitors, date range, country, channel/source/bounce rate; GA lag note | A | M — no tracking integration authorized |
| Orders | Orders / Tickets / Tax invoice requests / Refund requests; search; Export; order date/buyer/quantity/total/status | E/A | I — guests, registration/payment review, private export; tax invoices deferred |
| Order filters | Created, Pending, Success, Refunded, Generated | A | I — preserve actual MixerMates states |
| Ticket list | Ticket type and order-status filters; order/ticket/buyer information; export | E | I — existing tier/guest/ticket services |
| Promos | Group/list tabs, status filter/search/export, create flow; ticket types*, group*, code names*, fixed/percentage, unlimited/limited usage, start Now/specific, end event/specific | A | P — current promotion service is event promotion, not buyer discount codes; no fake promo editor |
| Private ticket access | Promo help describes zero discount revealing hidden tiers | A | I/P — invitations are account-bound; no unbound hidden-tier bypass |
| Affiliates | Add link; date, name, order count, ticket count, sales columns | X | M — affiliate revenue attribution outside Phase 1 |
| Gate agent | Username prefix + suffix*, ticket type/date*, search date/time/type, select all | E/A | I — same-account event-scoped staff, scanner permissions |
| Scan logs | Overview count/rate; verification log order/date/name/scanner/tier/QR; search/export | E | I — secure preview/admit/replay prevention and private logs/export |
| Notifications | Help/account navigation visible; no organizer notification settings proven | A | I — existing preferences and in-app notifications |
| Cancellation | No cancellation action exercised; refund settings do not prove cancellation workflow | E | I — independent reviewed event operations and cancellation retained |
| Seat maps | Team permission visible; no seat-map editor inspected | X | M — not required for current general-admission model |

## Chosen MixerMates adaptation

Three task-focused screens: **Event Details → Tickets → Photos, Preview & Submit**. Details ask name/category/date/time/city/location/short description/access. Ticket tiers default to free RSVP and expose price, quantity and max/order. Advanced fields stay behind a small number of purposeful disclosures. Photos include poster + separate optional banner, previews, replace and format feedback. Review submits for independent approval, never implies sales permission. Incomplete drafts remain saveable. Every advance validates preceding content on the server, with inline errors and first-error focus; progress buttons cannot jump ahead.

Keep one organizer identity keyed to the existing user, automatic stable server-unique readable links, historical ownership/links, private venue authorization, legacy services and money restrictions. Multiple sessions, arbitrary rich HTML/video, discounts, seat maps, affiliates and new settlement are explicitly deferred rather than represented by nonworking controls.

## Phase 1 outcome index

The table above preserves the pre-implementation audit. Final local changes are verified in [ORGANIZER_PHASE_1_REPORT.md](ORGANIZER_PHASE_1_REPORT.md):

| Audited gap | Final local status |
|---|---|
| Customer entry interrupted by plan selection | Implemented: free capability on the same identity; fresh customer header-click browser test passes |
| Missing organizer identity/automatic profile URL | Implemented: one identity per account, editable name, stable unique slug and safe public projection |
| Long automatic event suffix / legacy ID ambiguity | Improved: readable collision suffixes, reserved names and legacy IDs protected; existing links stable |
| Seven-step navigation bypass | Fixed: three-step client/server validation, no forward indicator jump, query/keyboard bypass blocked |
| Unfinished ticket/question input | Implemented: private resumable snapshot, canonical validation preserved |
| Separate cover banner | Implemented: independent validated owner-bound artwork and poster fallback |
| Hidden/paused ticket projection | Fixed: hidden definitions excluded from public/checkout data, paused checkout blocked; owner inventory retained |
| Dense Studio navigation | Implemented: four primary tasks and secondary selected-event tools; both themes/devices verified |
| Multi-session, cropping, rich embeds, buyer discount codes, affiliates, seat maps and tax invoices | Deferred advanced/out-of-model scope, with reasons in the final report; no false controls |
| Existing booking, money, moderation, private-location and scanner services | Preserved; regression and isolated migration evidence pass; real sales remain disabled |
