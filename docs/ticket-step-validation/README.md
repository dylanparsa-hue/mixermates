# Tickets-step validation correction — November 1, 2026

The reported behavior was a defect: the Tickets step validated ticket values but skipped publication prerequisites. Final submission then discovered missing organizer verification, mapped that error to the payment-recipient selector, and returned the user to Tickets. A previous accessibility check had recorded that late return as expected behavior; this correction supersedes it.

## Result

Paid organizer verification, owned active recipient approval and entry/cancellation conditions are checked before Tickets → Photos & Preview on both client and server. The paid requirements are always visible on Tickets. Verification has its own status, error, recovery instructions and actual verification-form link; recipient errors no longer contain verification errors. Cancellation conditions now live on Tickets. The creator shows all missing requirements together, focuses the first relevant target, and opens every nested disclosure containing an invalid field.

Next refreshes current account/recipient readiness from the server. A refresh action is available after completing approvals in another tab. Save Draft continues to preserve incomplete input, including a selected recipient that has since become inactive, without changing the canonical financial configuration. Submission still independently rechecks current approvals and private unfinished input; an approval revoked after preview can therefore block submission. No verification, recipient approval or payment authority is granted automatically.

Advanced entry options now validate unresolved Fee/BYOB relationships, missing prices and malformed decimal input before preview. Free creation remains available without paid prerequisites. The existing verification form is now also reachable on the Payment methods page; the previous link led to a page that lacked that form.

## Recover the existing paid draft

1. Open organizer verification from Tickets and submit fictional organizer details. In Payment methods, submit a fictional recipient and a fictional QR for review.
2. Use the local Admin workspace to review those two fictional requests, then return to Customer.
3. Return to the draft, refresh requirements, select the approved recipient, and add entry/cancellation conditions. Next then opens Photos & Preview. Saving a draft is available throughout.

These steps test the existing independent-review workflow. No real identity documents, bank details, funds or external messages are needed or authorized.

## Verification

- Full isolated regression: 385 counted, 384 passed, 0 failed, 1 fixture-gated subscription group skipped. The standalone monthly subscription test passed in this run.
- New pure validation checks cover paid/free prerequisites, pending verification, inactive/foreign recipient IDs, production restrictions, entry relationships and malformed prices.
- Creator API regression rejects a forged advanceTo:2 request before preview and still rejects direct invalid submission.
- Eight grouped browser journeys pass across 390px and 1440px, including all missing paid requirements together, incomplete save, pending verification, independent fictional approvals, successful final submission without returning to Tickets, actual verification-form access, and advanced nested-field error recovery. No page errors or horizontal overflow.
- Four current captures inspected: mobile/desktop in Light/Dark. The mechanical design detector reports no findings. TypeScript and optimized isolated Next build pass. A screen-reader session was not performed.
- All 65 protected canonical-database/original-asset hashes remain unchanged. The test created only separate fictional QA users/events/recipients in the disposable localhost database. The user’s existing draft was not edited by the QA script. No production access, deployment or Phase 2 work.

Evidence: browser-results.json, regression.log, build.log, source-preservation.json, design-detector.json and blocked-*.png. Repeat browser checks with scripts/ticket-step-validation.mts under the verified isolated Lab environment. Older Phase 1 screenshots/results remain historical.
