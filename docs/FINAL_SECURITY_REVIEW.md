# Phase 10 final local security review

**PASS for executed local scope; not a penetration-test or production certification.** 348 automated tests retain all 331 Phase 9 cases. Each SQL engine separately runs29 Phase 9 cases,21 security/lifecycle/concurrency checks and9 Phase 10 cases. Full role matrix and limits are linked from PHASE_10_REPORT.md.

| Boundary | Executed evidence / result |
| --- | --- |
| Registration/login/logout/expiry/credential race | Retained account suites; stale verified password/securityVersion cannot mint a session; suspension/reactivation/revocation tests; production-mode local cookie/logout smoke |
| Renewal | No sliding renewal is implemented; seven-day session lifetime/expiration is preserved. No renewal capability is invented. |
| Password change/reset | Existing hash, UTF-8 bcrypt limit, single-use/expired reset, session invalidation and private mailbox tests retained; no real recovery email |
| Roles / staff / private event | Anonymous/admin, customer/finance, unrelated organizer, scanner financial denial, private grants/receipts/notifications and stale staff/session checks pass |
| Payments | Receipt cannot confirm funds; exact amount/recipient snapshot, independent reviewer, registration/BYOB separation, rejection/corrections, duplicate flags and idempotent confirmation/issuance preserved |
| Admission | Two different authorized scanners racing QR/manual commit one check-in/private attendance; cancellation/suspension/revocation block future eligibility; committed history remains |
| Operations | Claim/lease/retry/exhaustion/consent/idempotent mailbox tests; failure alert is in-app-only, deduplicated and excludes customer content |
| Infrastructure failure | Real unavailable-client failure and empty incompatible-schema HTTP tests return safe503 without SQL/passwords; no false payment/ticket/admission success |
| Uploads / injections / caching | Retained streamed body bounds/full image decode, unsupported bytes/oversize/private ownership, hostile origin, persisted rate buckets, CSV injection and private no-store tests |
| Test tooling | E2E no longer starts canonical `pnpm dev` on0.0.0.0; requires owned fictional marker/contained DB/explicit loopback origin, prestarted server and disabled sales. Automatic traces/screenshots disabled to avoid credential capture. Canonical default refusal executed. |

Three concrete corrections: single-connection default for SQLite client to prevent demonstrated lock amplification (explicit configured pool options retained; MySQL unchanged); safe transient DB/schema API503 classification including code-less SQLite initialization errors; guarded/current Playwright configuration and selectors. No stack upgrade, new payment engine, auth redesign or sales enablement.

Configuration inspection found existing hard-coded fail-closed real-sales policy, release-mode defaults, CSPRNG hashed database sessions (no missing signing-secret fallback), private blob authorization, bounded uploads and environment-gated test transports. DB_* precedence remains documented and cleared in every local runner. Neither SITE_MODE nor a malformed/enabled TICKET_SALES_MODE activates real payments. No startup auto-repair/migration is used in Phase 10. Non-API server-render errors are not claimed to have the same503 JSON contract.

The in-app mock transport proves local idempotency only; a future provider must honor its own durable idempotency contract. The API cannot write an in-app alert while its DB is unavailable. Shared-proxy rate-limit/header trust, hosted cookies/TLS/CDN, retention and external monitoring remain independently unverified. Dependency audit reports0 advisories at execution time, not an absence-of-vulnerabilities guarantee.

Payment exports remain finance-scoped/formula-safe and minimal; guest exports exclude raw QR/receipts/unnecessary contacts and recheck permission per200-row batch. They are not a frozen accounting snapshot. Evidence contains hashes, fictional IDs and masked screenshots; no passwords, reset links, raw QR tokens, private credential files or SQL dumps were copied.

Evidence: phase10/tests-final.log, *-phase9-tests.log, *-runtime-checks.log, *-phase10-tests.log, http-schema-failure.json, optimized-smoke.json, e2e-canonical-refusal.log, dependency-audit.json. Physical camera/Safari/screen-reader/real bank/hosting acceptance is NOT RUN.
