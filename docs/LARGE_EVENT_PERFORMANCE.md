# Phase 9 large-event performance

October 27, 2026 · Asia/Kuala_Lumpur · localhost only. Apple M2 Max, Node 22.23.3, Next 16.4.2 development server, isolated SQLite. Fictional sizes are local test fixtures, not production capacity promises.

|Attendees|Entrance median ms (3 samples)|Entrance queries|Entrance JSON bytes|Guest first-page ms (one sample)|Name-search ms (one sample)|Guest-page queries|
|---:|---:|---:|---:|---:|---:|---:|
|50|9.28|22|11,543|3.26|4.05|10|
|500|9.37|22|11,833|2.85|3.56|10|
|2000|14.64|22|12,092|3.17|7.08|10|
|5000|27.73|22|12,093|3.03|9.54|10|

Each entrance response transfers at most 50 ticket rows plus 10 recent arrivals. Guest queries use database search/filter/sort/count and 50-row pages, not all-row browser filtering. Pages, search, names and confirmed-state filtering were measured separately at every size. At 2,000 guests the earlier Phase8 entrance returned 459,165 bytes / 22 queries / 116.26 ms median; Phase9 returns 12,092 bytes / 22 queries / 14.64 ms median. The before/after runs were on the same Mac in different sessions, not a controlled production comparison. The Phase8 N+1 repair is preserved; the row payload is now bounded.

108/108 measured HTTP requests returned 200; zero failed. HTTP workload retains event/tier/organizer/admin/audit/My Tickets measurements and adds paged guest and guest-search requests. Actual admission, booking and mock-notification service timings remain in raw evidence. Peak sampled fixture-process RSS: 282.53 MiB. This includes fixture/client work and is not server-only memory, sustained load, leak testing or distributed throughput. Search uses bounded substring queries; it is not a full-text index/SLA.

`phase9/performance-acceptance.json` contains every timing, byte count and query count. `query-plans.json` actually confirms the event/date/id pagination and receipt-fingerprint indexes. Indexes are additive in both provider migrations. The first exploration used 29 entrance queries; grouped database aggregates reduced acceptance to 22 at every fixture size. There is no per-guest query loop.

Private guest/financial CSV uses 200-row keyset batches in a response stream; authorization repeats per batch. Exports contain no admission tokens, receipts or payment QR credentials and record an audit. Exporting is not a public URL. The in-process compatibility guest-export helper still collects its returned string for existing internal callers/tests; the HTTP route streams.
