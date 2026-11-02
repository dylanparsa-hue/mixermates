# Phase 8 issue register

October27,2026 · Asia/Kuala_Lumpur · isolated fictional localhost only. No new master feature IDs.

All12 selected reproducible technical issues below are **FIXED AND VERIFIED LOCALLY**. Severity identifies impact; a fix does not complete the wider linked product facet. Baseline source is preserved outside the project under `mixermates-phase8-20261027/baseline`.

## Prioritized technical worklist (Category A)

### P8-01 — P0 — Private entry instructions disclosed by the general event projection
- Existing feature IDs: J-014, O-017.
- Reproduction: Set hidden location and address-bearing entry instructions; request the event without location permission. The preserved Phase7 function returns the instruction.
- Expected: Only location-authorized accounts receive door instructions.
- Required fix / implemented change: Mask entryInstructions alongside exact venue and coordinates.
- Verification: Phase8 public projection test; baseline-reproductions.json.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-02 — P0 — Hidden venue searchable through result membership
- Existing feature IDs: J-014, O-017.
- Reproduction: Create a PUBLIC event with HIDDEN location; search for its unique venue string. The old query includes venue without checking location visibility.
- Expected: Hidden venue cannot be inferred by searching it.
- Required fix / implemented change: Match venue only for PUBLIC events with PUBLIC location; retain title/city/genre search.
- Verification: Phase8 HTTP hidden-venue search negative.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-03 — P0 — Login could mint a current session using an older verified password
- Existing feature IDs: G-021, K-004.
- Reproduction: Read a credential snapshot, change password/securityVersion, then persist a login session. Previously createSession reread and adopted the newer version without comparing the checked credentials.
- Expected: A concurrent password/security change requires a new login.
- Required fix / implemented change: Persist sessions transactionally against the passwordHash and securityVersion actually verified; wire both login adapters.
- Verification: Phase8 stale-version and replaced-hash negatives; both provider runtime checks.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-04 — P0 — Legacy request limits trusted Content-Length
- Existing feature IDs: K-014, H-003.
- Reproduction: Stream more than the allowed bytes without a Content-Length header. Previously formData/json could consume the whole request.
- Expected: Enforce actual streamed bytes, even when the header is absent or false.
- Required fix / implemented change: Share boundedBody; cap JSON at100,000 and legacy multipart at4,100,000 bytes; retain4 MB image/10 MB evidence distinction; throttle ordinary image uploads.
- Verification: Phase8 cancelled-stream test and HTTP upload tests.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-05 — P1 — Image headers accepted malformed pixels and mismatched MIME
- Existing feature IDs: H-003, O-015.
- Reproduction: Submit only PNG/WebP magic bytes or a PNG with damaged compressed data, or claim text/html for PNG bytes.
- Expected: Only matching, decodable supported still rasters are stored.
- Required fix / implemented change: Use existing installed sharp0.35.5 explicitly; inspect format, dimensions/pages then decode pixels, with25 MP bound. Preserve original accepted bytes and purpose limits.
- Verification: Phase8 signature/SVG/damaged-pixel tests; previous public/QR/evidence upload tests with valid raster fixtures.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-06 — P1 — Exception responses missed private cache controls
- Existing feature IDs: K-003, J-014.
- Reproduction: Request a private resource without authorization or with invalid input. Earlier catch returns bypassed the success-only cache header.
- Expected: Errors and successes consistently prevent private caching and content sniffing.
- Required fix / implemented change: Apply private no-store/nosniff/no-referrer after both success and error paths.
- Verification: Phase8 exception-header tests;27 browser authorization/cache checks.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-07 — P1 — Reminder queue starved after its first100 bookings
- Existing feature IDs: N-009.
- Reproduction: Create105 eligible confirmed bookings and run jobs three times. Preserved Phase7 code produces only100 reminder notices.
- Expected: Repeated bounded runs reach later bookings exactly once.
- Required fix / implemented change: Walk keyset-ordered100-row candidate pages, skip existing booking/terms dedupe keys and count only newly created reminders.
- Verification: Baseline reproduction100/105; Phase8 and MySQL/MariaDB105-booking drain checks.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-08 — P1 — Final expired leases were failed silently and outside targeted job scope
- Existing feature IDs: K-011, N-001.
- Reproduction: Expire a PROCESSING attempt3 lease, then process an unrelated onlyId. Old code sweeps the unrelated row and creates no failure audit/alert.
- Expected: Only scoped jobs change; exhausted jobs have safe audited failure and deduplicated admin visibility.
- Required fix / implemented change: Bound and scope final-lease discovery; transactionally CAS status, add audit and in-app-only failure alert.
- Verification: Baseline reproduction; concurrent final-lease and onlyId tests on all three engines.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-09 — P1 — Entrance holder names caused N+1 queries
- Existing feature IDs: H-012, H-015, K-017.
- Reproduction: Load a2000-attendee fictional guest list with one IC-name field. Baseline makes2021 queries.
- Expected: Read the shared field once and preserve all holder names/permissions/counts.
- Required fix / implemented change: Use one event field lookup and pure holderName projection.
- Verification: performance-before.json versus performance-acceptance.json:2021→22 queries.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-10 — P1 — Mobile ID acknowledgement label collapsed into a vertical column
- Existing feature IDs: G-001, H-013, J-012.
- Reproduction: Open a valid18+ ticket preview at390px. The checkbox inherited width100%, consuming its flex row. Document overflow still appeared to pass.
- Expected: A readable label and clear required acknowledgement fit small phones.
- Required fix / implemented change: Keep checkbox24px with nonshrinking basis, shrinkable text span and44px label hit area; preserve server ID gate.
- Verification: browser-supplement.json:14 control measurements; final screenshots; required button remains disabled until checked.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-11 — P0 — Concurrent event lifecycle change aborted the whole job run
- Existing feature IDs: K-011, N-009, N-001.
- Reproduction: Run reminders while another transaction changes an eligible event. A legitimate409 event fence aborts before later reminders and notification processing. This occurred in the final full regression.
- Expected: Skip the changed booking, continue independent work, persist genuine failures and retain revoked-actor denial.
- Required fix / implemented change: Handle per-reminder409 as changed eligibility; audit/count other failures; rethrow403.
- Verification: New real suspension/runner race;302-test suite;21 checks per MySQL/MariaDB.
- Result: FIXED AND VERIFIED LOCALLY.

### P8-12 — P1 — Operational CLI still accepted only Phase7 paths
- Existing feature IDs: K-011, K-018.
- Reproduction: Run the documented worker from the new isolated Phase8 preview. Old workspace guard rejects it.
- Expected: The authorized new fixture runs; sibling/canonical/provider/production targets fail closed.
- Required fix / implemented change: Allow explicit Phase7/8 scratch roots, resolve real paths, require DB inside the calling workspace and reject DB_* overrides/production.
- Verification: cli-jobs.log positive with0 failures; cli-jobs-denied.log rejects sibling DB.
- Result: FIXED AND VERIFIED LOCALLY.

## Other remaining work and decisions

| Category | Remaining P0 facets | Disposition |
| --- | ---: | --- |
| A — Technical |43| Targeted high-risk fixes above and preserved regression; broader facets remain incomplete. |
| B — Owner/human decisions |22| Real event terms, policies, organizer/recipient/venue verification and operating responsibility. |
| C — External/production operations |10| Provider delivery, monitored hosting, backups/restore and eventual separately authorized release. |
| D — Physical acceptance |4| Real phones, cameras, ID/door conditions and connectivity. |

The categories are the **primary dependency** of each row; several also need other categories. Exact79-row mapping: `phase8/p0-triage.json`. This is not79 new bugs or a promise to implement every facet.

Unselected technical scope remains explicit: broader suspicious-payment/transfer reconciliation (F-009/F-011/F-012), global duplicate-evidence investigation across accounts/history, very large-list pagination/throughput, production worker supervision/retention, outage detection and comprehensive abuse/penetration testing. The current upload duplicate screen is limited to the same customer’s most recent100 evidence records; it is not bank verification or a complete fraud system. No receipt alone can confirm money or issue a ticket. These broad facets remain incomplete.

B/C/D acceptance was not converted to a pass through fictional data. There is no known unresolved high-severity defect from the selected, executed Phase8 local checks. Real-event and production readiness remain incomplete.
