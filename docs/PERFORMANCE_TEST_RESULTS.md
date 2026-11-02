# Current Phase 9 measurements

See LARGE_EVENT_PERFORMANCE.md and phase9/performance-acceptance.json:50/500/2000/5000 attendees,22 entrance queries at every size,50-row pages,108 successful measured HTTP requests,zero failures. At2000 attendees entrance JSON is12,092 bytes, median14.64ms; guest page uses10 queries. Actual local fixture results are not production guarantees. Earlier Phase8 measurements below remain the comparison baseline.

# Phase 8 performance results

Environment: Apple M2 Max; darwin 27.0.0; Nodev22.23.3; Next16.4.2 development server on127.0.0.1:3032; isolated SQLite; fictional50/500/2000-account fixtures. Optimized builds were validated separately. These are local measurements, not a production SLA or launch traffic forecast.

## Demonstrated improvement

| Attendees | Baseline service median ms | Final service median ms | Baseline queries | Final queries |
| ---: | ---: | ---: | ---: | ---: |
|50|12.65|6.19|63|14|
|500|99.39|29.48|513|14|
|2000|364.73|116.26|2021|22|

Entrance originally queried the same IC-name field for every booking. It now resolves the field once. At2000 attendees this removes1999 queries; median time improves approximately68%. The returned permission-filtered guest data/counts remain identical in the comparison fixtures. The earlier isolated after run measured107.38ms; final acceptance measured116.26ms while builds also used this Mac. All raw samples remain available; neither number is a deployment claim.

## Wider executed workload

Each HTTP endpoint has three samples at each fixture size; table cells are median milliseconds. Service transactions and the50-notification batch have one measured execution per fixture size.

| Operation |50|500|2000|
| --- | ---: | ---: | ---: |
|Event detail|10.63|10.89|9.38|
|Ticket selection|10.90|13.00|10.68|
|Organizer dashboard|17.05|18.87|23.47|
|Guest list search|13.30|42.91|132.78|
|Admin overview|17.70|27.85|30.90|
|Filtered audit|17.98|20.67|22.91|
|My Tickets|13.36|15.98|15.42|
|Atomic admission service|8.61|8.40|15.01|
|Booking transaction|8.29|6.66|8.35|
|Notification batch|183.42|164.91|191.63|

All63 measured HTTP responses returned200; failed requests:0. Maximum observed HTTP latency:146.75ms. Final2000-guest JSON size:459,165 bytes. Fixture-process peak sampled RSS:314.58MiB; this is not server-only memory or a memory-leak certification. Query counts come from Prisma query events; HTTP timings include request, database, serialization and body download.

The guest search workload measures the current entrance endpoint returning its permitted list; filtering and20-row guest display run in the existing UI. Admin audit/account views exercise current server filters/pages; organizer booking previews remain capped100, notifications100/10-page UI, support50 and change history50. My Tickets loads one fictional owner’s history in these fixtures, not2000 tickets for one user. Full guest-list transfer remains proportional to event size; arbitrary-scale server pagination is still later work.

Notification transport is a local counting adapter; no external delivery was measured. Booking/check-in use actual state services and SQLite. Dedicated SQLite/MySQL/MariaDB suites cover contention separately. The workload is sequential, not a sustained2000-client stress test. Transaction-conflict rate, production proxy/host/CDN behavior, network outage under physical scanning and distributed throughput remain unmeasured.

Evidence: phase8/performance-before.json, performance-after.json, performance-acceptance.json. An exploratory expanded run lacked query instrumentation due to static-import order; it is superseded by performance-acceptance.json. Fixtures were removed after each measured size. No production data was used.
