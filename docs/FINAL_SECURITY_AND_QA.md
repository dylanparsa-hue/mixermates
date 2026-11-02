# Final security and QA — Phase 11

October 27, 2026 · fictional localhost only. **PASS for executed software scope; full requirement closure PARTIAL.** Not a production/penetration/WCAG/physical-device/bank certification.

## Results and distinct denominators

| Check | Executed result | Evidence |
| --- | --- | --- |
| Unchanged Phase10 baseline |348 passed;0 fail/skip/cancelled | phase11/baseline-tests.log |
| Final Node suite |353 passed;0 fail/skip/cancelled;348 retained +5 counted cases (parent +4 targeted regressions) | phase11/tests-final.log; tests/phase11.test.ts |
| Playwright current suite |10 desktop/mobile cases passed;0 skipped | phase11/e2e.log |
| Source-driven browser journeys |10 main assertions;7 supplemental checks;3 QR/entrance checks;2 additional account/summary checks | phase11/browser-results.json, browser-supplement.json, browser-entrance.json, final-ux.json |
| Responsive/theme measurements |476 executions at320/375/390/430/768/1024/1440 in light/dark;0 page errors/overflow/broken loaded images | Browser JSON above; counts include revisited surfaces, not476 unique pages |
| Full-screen QR |7 sizes, private rendered QR decode, focus trapping/Escape and required ID confirmation gate | phase11/browser-entrance.json |
| Accessibility |13 DOM/keyboard/reduced-motion surfaces;0 unnamed visible controls,0 measured non-checkbox/radio controls below24px,0 overflow; simulated503 announced | phase11/accessibility.json |
| SQLite |14 migrations;3 active copies integrity ok/0 FK violations;42-table populated fresh restore matches schema/rows/migration fingerprints | phase11/sqlite-integrity.json, sqlite-recovery.json |
| MySQL8.0.41 |29 retained Phase9 counted tests +21 runtime checks +9 Phase10 cases +5 Phase11 cases;42-table dump/restore fingerprints;9 migrations,56 FK checks/0 violations | phase11/mysql-*.log, mysql-recovery.json |
| MariaDB11.8.9 |Same29+21+9+5 separate measures;42-table dump/restore fingerprints;9 migrations,56 FK checks/0 violations | phase11/mariadb-*.log, mariadb-recovery.json |
| TypeScript/schema/build |TypeScript and both schema validations pass; independent SQLite/MySQL-client optimized webpack builds pass | phase11/typecheck-final.log, *-validate.log, *-build*.log |
| Optimized local security smoke |Public Coming Soon/no-store, Secure/HttpOnly/Lax cookie, sales lock, hostile-origin refusal and logout pass | phase11/optimized-smoke.json |
| Dependency audit |0 reported advisories at execution; no dependency/stack upgrades | phase11/dependency-audit.json |
| Preservation |65 protected files unchanged, including original DB,34 original public files and historical migrations;19 old test files retained, one workspace guard adaptation only | phase11/preservation-results.json |

Provider checks, browser measurements, requests and Node tests are separate denominators; do not add them into an inflated aggregate.

## Confirmed issues fixed

**P11-01 — a stalled notification adapter could block a worker indefinitely.** Executed against unmodified baseline: still blocked after150ms until the harness explicitly released the promise. New10-second default deadline is below the60-second claim lease; internal testable timeout is bounded1–30000ms. AbortSignal is supplied and honored by the local mailbox before publishing. Timeout persists `LOCAL_TRANSPORT_TIMEOUT`, releases worker token/lease and retains exponential retry/stable key. Tests cover abort-aware stall, abort-ignoring late success, continued later work, final failure/deduplicated alert, bad deadline and authorization. No provider was connected. An adapter ignoring abort can still create an external late side effect; a future provider must honor durable idempotency.

**P11-02 — organizer setup loaded all bookings/tickets for cancellation impact and included demo money in its amount.** Replace raw relation arrays with server counts and a confirmed organizer-direct payment aggregate. The UI retains its existing confirmation and displays those scoped totals.5000 fictional bookings do not add guest rows to the response; total summary growth is asserted below200 characters from the empty-event response. Demo-provider amounts are excluded. A different organizer and ordinary customer cannot read the event setup. Remaining scaling with owned-event count and broader pagination are disclosed rather than claimed solved.

## Security and workflow review

Authentication retains bcrypt validation/UTF-8 length limits, hashed DB session tokens, fixed seven-day expiry, active/securityVersion checks, credential-race prevention and supported revocation. Password reset is private local mock/single-use only; actual email and hosted TLS/proxy behavior remain unverified. No auth/dashboard rebuild or signing-secret workaround.

Server permissions still separate customer, owned organizer, unrelated organizer, scanner/guest, registration reviewer, finance reviewer and admin. Private invitation/location/receipt/QR/attendance/support/notification/export boundaries and no-store/origin/rate controls remain in353 tests. Revoked sessions/staff and suspended/cancelled/wrong-event/used tickets fail. Profile attendance stays private by default. Review of query projections, safe error responses and CSV escaping found no new demonstrated authorization bypass in this scope; this is not an unrestricted security guarantee.

Payment evidence alone cannot confirm funds. Exact original recipient/version/amount and independent review remain required; registration/BYOB gates are separate. Duplicate evidence produces neutral investigation signals, never automatic accusation/rejection. Funds confirmation is durable before issuance; injected ticket INSERT failure and authorized idempotent recovery are rerun in Phase10 retained tests on all providers. Cancellation/refund preserves original commitments and used attendance; reporting a transfer and customer acknowledgement are not independent bank verification. No real bank/sales/transfer was used.

Inventory/idempotency/expiry/review holds, two-scanner QR/manual contention, once-only admission/private Passport and ticket revocation remain tested. Operational claim/lease/crash/retry/consent/alert tests pass. DB-backed in-app alerts cannot monitor a dead DB independently. Current CLI ran30 mock jobs,0 failures/expiry/reminders; this is not supervised or real-message delivery.

## Browser and UX scope

Fictional customer invitation → questions/proof → independent review/approval → private ticket → ID/entry → duplicate denial → private Passport; cancellation/refund acknowledgement; independently reviewed rescheduling with old terms preserved; organizer/admin/support/audit/operations/readiness/finance/guest surfaces all retain current journeys. Added actual browser account registration/logout/password login for an independently marked fictional public event and aggregate cancellation impact rendering. The actual Halloween draft remains DRAFT/UNCONFIRMED/sales paused; one checked-in fictional ticket/Passport survives a process restart and protected read.

Four standing skills applied together: frontend-design, impeccable, ui-ux-pro-max and web-design-guidelines. Existing Operate surface/brand/tokens/Coming Soon remain. Changed cancellation detail and registration were visually inspected on mobile390 and desktop1440; the destructive cancellation action was checked with a non-mutating click trial on both sizes. Mechanical detector returned[]. Review used [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). No new visual world, font, logo, camera engine or CSS redesign.

The measured24px floor is not a claim that every touch target is44px. This is not full pixel-contrast,200%zoom, assistive-technology or WCAG certification. Actual iPhone Safari/Android cameras, low light/focus/brightness/ID/network/door staff remain NEEDS VERIFICATION. Map resources were local/mocked; provider availability is not certified. Phase10 throughput/migration-failure reports remain dated prior evidence; no new hosted/distributed/soak capacity was tested.

## Exploratory failures and corrections

- An added QR-decoder harness read the dialog before its asynchronous QR image existed. Added an explicit visible-image wait; final private QR/focus/ID checks pass. Product scanner code was unchanged.
- Added account UI fixture initially omitted required `reviewOutcome=APPROVED`; registration correctly returned404. A new explicitly moderated fictional fixture passes account register/logout/login. The unapproved fixture remains preserved; no sales/identity guard was weakened.
- Canonical E2E default invocation intentionally fails its workspace/origin/DB gate. Current owned Phase11 E2E passes. No canonical server/database was launched by that refusal.
- Prisma emits its pre-existing package.json#prisma deprecation notice; pinned Prisma6.19 validation/builds succeed. NO_COLOR/FORCE_COLOR is a harmless test runner warning, not a skipped test. No required final check failed.

All failed raw attempts stay in private scratch. No unsupported result is recast as a pass. Remaining software/operating gaps and exact76 P0 statuses: [FINAL_TECHNICAL_P0_STATUS.md](FINAL_TECHNICAL_P0_STATUS.md).
