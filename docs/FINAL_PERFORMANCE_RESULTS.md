# Final Phase 10 local performance results

Apple M2 Max · Node 22.23.3 · Next16.4.2 · isolated SQLite · development server. Optimized provider builds were tested separately. Fixture count is not concurrent user count.

## Sequential service measurements

| Attendees | Entrance median ms (3) | Queries | JSON bytes | Guest queries / max rows |
| ---: | ---: | ---: | ---: | --- |
| 50 | 8.08 | 22 | 11544 | 10 / 50 |
| 500 | 9.43 | 22 | 11834 | 10 / 50 |
| 2000 | 15.33 | 22 | 12093 | 10 / 50 |
| 5000 | 24.55 | 22 | 12094 | 10 / 50 |

108/108 sequential measured HTTP reads succeeded. Booking/admission/mock-notification service timings and query/RSS samples are retained in [raw sequential results](phase10/performance-after.json). The notification adapter sends no real messages.

## Concurrent and paced requests

A separate5000-attendee workload issues three batches at each of10/25/50/100 concurrent requests. Eight routes rotate discovery, event detail, ticket selection, guest search, entrance data, admin overview, My Tickets and reconciliation. Then10 workers send paced requests for approximately20 seconds.

| Group | Requests | Success | Failure | Median ms | P95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| batch:10 | 30 | 30 | 0 | 131.53 | 1010.21 |
| batch:25 | 75 | 75 | 0 | 284.52 | 401.07 |
| batch:50 | 150 | 150 | 0 | 542.23 | 794.92 |
| batch:100 | 300 | 300 | 0 | 994.39 | 1421.31 |
| sustained:10 | 846 | 846 | 0 | 29.34 | 82.76 |

**1401 successful reads; zero failed reads.** Paced run lasted 20.22s.25 concurrent POST reservations for 10 places produced exactly10 successful holds,15 expected409 capacity refusals,10 reserved seats and zero prematurely issued tickets. Every POST latency/status is recorded; business refusals are not hidden as successes. [Raw concurrent results](phase10/concurrent-load.json).

Sampled server RSS after this developer run: 1406.4 MiB; client RSS: 288.6 MiB. This is a snapshot after retained fictional fixtures/development compilation, not a peak/leak test or hosted memory requirement. Earlier fixture attempts were preserved, so total developer DB rows exceed this workload's5000-attendee event.

## Verified bottleneck and correction

The pre-fix25-way checkout attempt maintained capacity but some responses took roughly48 seconds and returned503 after SQLite lock contention. `clientDatabaseUrl()` now defaults SQLite to connection_limit=1, preserving explicit URL options and all non-SQLite connections. The accepted repeat completed10 holds/15 capacity refusals without infrastructure failure. [Sanitized prior timings](phase10/sqlite-contention-before.json). Pool sizing guidance was checked against [Prisma v6 connection documentation](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-pool); local before/after measurements justify this specific SQLite setting.

Payment evidence/review, ticket insertion failure/recovery and notification jobs are actual service integration tests with TAP durations, rather than claimed high-throughput finance benchmarks. No sustained paid-proof upload/review saturation, multi-process/distributed/soak test, real hosted load, externally agreed traffic target or SLA was certified. Server memory and100-concurrency P95 must be reviewed against a later actual host/traffic budget. No production capacity commitment.
