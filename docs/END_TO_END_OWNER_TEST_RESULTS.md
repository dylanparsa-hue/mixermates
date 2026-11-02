# End-to-end owner rehearsal results

28 October 2026, Kuala Lumpur. These are executed local software rehearsals using fictional data, not the owner's acceptance or real operational certification. The owner can repeat these journeys through the interface using one Test Lab entry code. No normal step requires database scripts.

## Executed journeys

| Journey | Observed result | Evidence |
| --- | --- | --- |
| Signup, validation, duplicate account, logout/login | Password minimum enforced; ordinary ATTENDEE created; duplicate visibly rejected; new customer can log in | `ui-correction/lab-signup-social-results.json` |
| Local password recovery | Local mailbox reset works; old sessions revoked; new password logs in. Fixed reset form retaining stale token after success | Same |
| Persona switching | Six distinct persisted identities; no repeated password; previous persona session revoked | `ui-correction/lab-security-results.json` |
| Draft → submission → approval | Organizer creates fictional event; separate Administrator approves through lifecycle service; future dates and tier persisted | Purchase/refund/cancellation browser journeys |
| Full mobile event builder | Two tiers of 20 seats, RM25 Early Bird and original provided rooftop artwork saved and survived reload; fresh owner rehearsal left DRAFT/unapproved | `ui-correction/lab-builder-results.json` |
| Booking and registration | Actual customer form reserves selected tier/quantity and required answer; owner can use full builder for tiers/questions | Purchase journey; unchanged domain tests |
| Fictional evidence | Sample receipt and actual phone file upload remain unconfirmed and ticketless | `ui-correction/lab-purchase-results.json`, `lab-refund-results.json` |
| Payment and registration review | Customer cannot confirm funds. Finance confirms with explicit fictional attestation; still no ticket until independent registration approval | Purchase results |
| My Tickets and QR | Eligible ACTIVE TEST ticket opens in actual private ticket dialog. Phone full-screen rendered QR decoded to its authorized credential in memory | Purchase and refund results; QR/token not published |
| Entrance and Passport | Required ID acknowledgement checked; admission stored; duplicate attempt rejected; Customer sees Passport after check-in | Purchase results |
| Refund | Before attendance: Customer requests; Finance approves, advances awaiting-transfer and fictional transfer report; Customer acknowledges; persisted REFUND_CONFIRMED / REFUNDED | Refund results |
| Reschedule | Independent approval advances event one day; original booked terms remain; Customer reads local update | Refund results |
| Cancellation | Existing impact-confirmation UI shows affected ticket, then cancels booking/revokes ticket; Customer notified; entrance rejects revoked ticket | `ui-correction/lab-cancellation-results.json` |
| Profile and privacy | Actual profile edit persists without changing privacy choices | Cancellation results |
| Friends/messages | Distinct consenting adults request, accept, send and receive persisted messages; friendship-only behavior preserved | Signup/social results |
| Support | Customer submits; Administrator replies/resolves; Customer reads private response | Cancellation results; original browser suite |
| Navigation/search | Event search empty/clear/reset, social arrow/Home/End tabs and search, map upcoming/history and phone view switch work | `ui-correction/responsive-results.json` |
| Safety failures | No-controller and persona-only denial; forged role/origin/proxy rejected; missing/mismatched marker denied/restored; community cannot read customer's booking; actual Halloween/legacy sales blocked | Security results |

## Automated verification

- **356 Node tests passed, 0 failed, 0 skipped**: original 353 retained plus three counted tests for strict Lab policy/request guards and Kuala Lumpur discovery dates. Multiple assertions inside each test are not inflated into separate tests.
- **10 original Playwright tests passed**, desktop/mobile: Coming Soon/private API denial, authorized discovery/theme/keyboard, staff separation, persisted draft save/reload, support response.
- **224 responsive executions**: 16 surfaces × seven widths (320, 375, 390, 430, 768, 1024, 1440) × light/dark. Zero recorded overflow, broken-image, community-action-wrap or page-JavaScript-error findings. Screenshots exist for 390/1440 plus photographic crops. This is not 224 unique pages or an exhaustive accessibility audit.
- TypeScript and optimized Next build passed; Prisma schema validation passed. Development and optimized Chrome CPU-throttled timing evidence is in `UI_PERFORMANCE_RESULTS.md`.
- Final independent-review repairs and state checks are recorded separately in `ui-correction/finish-qa-results.json` and `FINISH_REVIEW.md`.

The successful records describe final successful executions, not every exploratory harness run. Earlier retries exposed and helped fix actual reset-state and guarded event-detail access bugs; selector/race failures were corrected in the local harness. No failed exploratory screenshot is presented as acceptance evidence.

## Limits

“Entire website” means the important existing capabilities enumerated in this request are manually accessible in the guarded local workspace. It does not mean every possible input, device, role assignment or future feature is certified. Legacy catalogue events are clearly marked as previews; complete purchases use explicitly approved TEST scenarios. Actual Halloween is still unconfirmed/paused. The local mailbox, sample receipt and fictional transfer report do not exercise external providers or banking.

Physical phone camera/Safari/Android, real door/ID procedures, real payments, hosted databases, external email/SMS and production release have not been tested or authorized. Phase 11's broader operating closure remains PARTIAL. Owner visual acceptance is pending.

Preservation verification:31 original Prisma files (including canonical dev.db, schema and migrations),34 original public assets and20 original test files match their before hashes. New derivatives/tests were added separately. See `ui-correction/preservation-results.json`.
