# Local payment and ticket simulator — November 2, 2026

Working preview: **http://localhost:3082/explore**. Opens automatically as the fictional customer; no password or entry code. Local implementation only; no deployment, production access, real money, external messages or Phase 2 fee work.

| Owner question | Result |
| --- | --- |
| Create a fictional paid event without a real payment method? | Yes. Test Payment Simulator is the guarded local default. |
| Buy a TEST ticket from the normal website? | Yes. Explore → event → Book TEST tickets uses the actual booking route. |
| Simulate successful card payment with one confirmation? | Yes. Success is selected by default; click Pay … — TEST. |
| Simulate decline and cancellation? | Yes. Choose Local test outcome before confirming. Both persist an attempt without issuing a ticket. |
| Purchased ticket in My Tickets? | Yes. Real booking, payment and ticket records persist. |
| QR validated and admitted? | Yes. Browser opened the actual QR and validated its matching private payload through the existing scanner. |
| Duplicate admission rejected? | Yes. One check-in, then Already checked in; customer sees the used ticket. |
| Test refunds? | Yes. Request TEST refund, then simulate pending, failed or successful settlement. Successful refunds revoke unused tickets and release stock. Attendance still blocks routine refunds. |
| Separately test manual QR review? | Yes. Built-in sample receipt, independent finance review and registration approval remain available. |
| Simulator blocked in production? | Yes. Strict environment/database/request guards; production HTTP checks returned 404 even with simulator enable flags set. |

## Click through a purchase

1. Open the preview. To get untouched fixtures, open **Review tools → Add fresh TEST events**. Previous bookings remain intact.
2. Open a **TEST · Neon After Dark** event in Explore. Click **Book TEST tickets**, choose tier/quantity, then **Continue to your details → Review registration → Confirm Booking**.
3. Click **Pay with Test Payment → Pay … — TEST**. For other results, select **Declined Payment** or **Payment Cancelled** before confirming.
4. Click **View My Ticket**, or open **My tickets** and its ticket. Open **Full-screen QR**. Its **Manual entry code → Copy private code** contains the real QR payload.
5. Close the ticket. Open **Review tools → Entrance staff**, select that event in Scanner, paste the code, click **Validate ticket**, confirm the fictional ID check and **Confirm admission**. Validate the same code again to see rejection.
6. Choose **Workspace → Customer**. My tickets retains the checked-in status. Use a different, unadmitted paid booking for **Test refunds**.

## Create your own

Open **Create an Event**. Complete Event Details, add a paid ticket on Tickets and leave **Payment method: Test Payment Simulator** selected. The editable test policy is supplied automatically. Choose/upload artwork on Photos & Preview, then **Publish TEST Event Locally → Open TEST event & buy tickets**. No bank account, payment QR, organizer verification, manual payment approval or receipt is required for the default quick scenario. Required fields block the current step immediately.

Advanced manual review: add fresh fixtures, purchase **TEST · Manual QR Review**, click **Use sample TEST receipt**, then use Review tools' independent payment and registration reviewers. Finance must enter the exact fictional received amount, attest its independent check and record notes. Return to Customer to open the issued ticket. Choose **Private TEST invitation** for the latest generated private scenario.

## Actual verification

- Required browser acceptance journey passed: create → simulator → publish → purchase → paid ledger → actual ticket → QR → admission → duplicate rejection. [Results](payment-simulator/browser-results.json).
- Supplement passed 12 browser checks: free RSVP, multiple tiers/quantities, all refund outcomes, manual review, registration gate, private invitation, sold out, cancellation, reviewed reschedule, notifications, cross-user protection and responsive themes. [Results](payment-simulator/browser-supplement-results.json).
- **14 simulator tests passed**; **376 regression tests passed, 3 explicit skips**. The skipped general-suite checks are the optional access-server integration, guarded subscription integration and simulator integration. The simulator was run separately with all 14 passing; the retained subscription suite was also run separately in the verified Lab with 7 passing. [Simulator](payment-simulator/simulator-tests.log), [regressions](payment-simulator/regression-tests.log).
- SQLite and MySQL Prisma schemas valid; TypeScript and optimized production build pass. Additive migration and retained domain suites pass on fresh loopback MySQL 8.0.41 and MariaDB 11.8.9. SQL services stopped. [Provider results](payment-simulator/sql-provider-results.json), [build](payment-simulator/optimized-build.log).
- **14 production-mode requests returned 404**, zero simulator writes; Coming Soon preserved. [Results](payment-simulator/production-refusal-results.json).
- **18 visual renders passed** at 375/390/768/1440px, Light/Dark, reduced motion, landscape and enlarged text. [Results](payment-simulator/visual-results.json). No detector findings. Canonical DB and original supplied asset hashes unchanged.

No requested simulator functionality remains unfinished. Physical camera capture on an actual phone and a screen-reader session were not exercised; browser acceptance used the actual ticket's QR payload through the scanner's visible validation control. Owner visual acceptance remains separate.

If the preview is stopped, run `python3 /Users/parsa/.codex/tmp/mixermates-correction-20261102/preview/.local/start-test-lab.py`. Do not run migrations or test fixtures against `prisma/dev.db`. The preview's fictional DB and sessions are separate from the source database.
