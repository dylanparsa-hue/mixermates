# Ticket scanner acceptance — Phase 5

October 26, 2026. Only isolated fictional data and loopback servers. No public tunnel or production test.

## Executed

- Full Node regression: 223 tests, including all 200 existing counted tests and 23 new counted Phase 5 cases; no removed cases. See phase5/tests.log.
- New coverage: owner/export authorization; safe preview; distinct credentials and refresh; validation without admission; ID acknowledgement including inside the transaction; unknown/wrong-event/cancelled/refunded/invalid/revoked/used refusals; guest/scanner capability separation; owner CSV scope/audit/formula injection; manual method and counts; QR/manual and repeated-request races; revocation/suspension races; immediate staff-session revocation; private unique Passport records; raw-token-free audit.
- Existing Phases 2/4 retain paid-registration/evidence/funds/approval separation, demo/live rejection, event-ended/cancelled denial, stock, invitations and privacy/achievement regression.
- Browser: real local Chrome, camera permission denial, actual html5-qrcode decoding from a synthetic Y4M camera containing the fictional ticket credential, attendee preview, ID acknowledgement, confirmed admission, duplicate refusal, guest-name manual search, checked-in filter, offline warning, owner staff assignment/revocation and rejected fresh staff session. Authenticated private/safe SVG downloads verified. No mocked admission response was used. A supplemental full-platform localhost browser profile journey verified the event absent before admission and present after server check-in, while its attendance record remained private (passport-browser.json).
- 70 measured width/theme/surface combinations: 320, 375, 390, 430, 768, 1024, 1440; light and dark; active ticket, used ticket, My Tickets, staff entrance, organizer entrance. No document overflow, broken images or browser page errors. Contact sheets and individual captures are under phase5/screenshots. Seven additional full-screen native-dialog captures verify QR fit and Escape return at every requested width (fullscreen-results.json).
- Duplicate warning recaptured after a fresh review requested a readable MYT date/time. Verdict ship applies to that scored fix. Scope review and system documentation: phase5/design-review.md and design-system-check.md.
- Disposable MySQL 8.0.41: six existing migrations applied to a fresh empty local schema, eight transaction/authority checks passed. These are separate from the 223 SQLite regression tests. No MariaDB rerun is claimed in Phase 5; its Phase 4 evidence remains historical.

## Concurrency interpretation

QR/QR, QR/manual and five repeated requests commit one check-in. A user/event has one attendance row even with multiple admitted tickets. Revocation versus admission serializes: whichever commits first determines the valid outcome; a scan may succeed before revocation commits. Suspension similarly permits an earlier committed admission but rejects subsequent attempts. Two readers return the same committed counters. Tests do not promise that an admission already committed can be retrospectively undone.

## Physical camera — NEEDS VERIFICATION

No physical phone, real lens/focus, lighting, Safari or actual door-network rehearsal was available. Synthetic camera decoding proves browser integration, not hardware reliability. No real admission is authorized.

For a later owner-operated Android USB rehearsal, keep the server bound to 127.0.0.1, approve USB debugging on the trusted device, use `adb reverse tcp:3001 tcp:3001` if ADB is available, and open `http://localhost:3001` on the phone. Verify the browser treats localhost as a secure context. Do not bind publicly or create an internet tunnel. Other devices require a separately arranged trusted secure local connection; if unavailable, keep the test blocked.

Record device/OS/browser and results for: permission allow/deny, back-camera selection, camera in use, absent camera, unsupported context, initialization failure, camera switch, torch when available, bright/dim lighting, guest screen brightness, focusing distance, repeated reads, hidden tab, navigation/stop/restart, network interruption before and during confirmation, wrong event, duplicate and staff revocation. Use the fictional rehearsal and unused TEST tickets. Confirm the camera indicator turns off after stop/navigation.

## Limitations and recovery

No synchronized offline admission, offline queue, dynamic anti-screenshot QR, identity image collection or automatic check-in reversal was added. These are not claimed. Browser-derived counts refresh every 30 seconds while visible and immediately after actions; another device may need Refresh attendance before the interval.

The browser harness is scripts/phase5-captures.mjs. It expects a prepared isolated preview with unused fictional tickets and active staff; use a fresh fixture workspace for a new full run. It never targets a hosted URL. Temporary test harness selector failures were corrected (wrapped select labels include options); a full accepted run is recorded separately. The access test session helper now uses the current persisted securityVersion, so staff-assignment invalidation cannot accidentally make its valid-session fixture stale. Authorization assertions were retained.
