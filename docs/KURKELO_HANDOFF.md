# Kurkelo API handoff from Shitemap

Consumer request dated October 9, 2026. Requirements below record the original handoff; the verified service update is recorded separately below and does not imply all requirements are complete. Related: [delivery plan](../PLAN.md), [operations](OPERATIONS.md).

## Service update — October 9, 2026

The user reports deployed Kurkelo native caller/hostname limits of 20 calls/10 seconds and 60/minute, with 38 tests plus local/live throttling checks passing. [Kurkelo LIMITS.md](/Users/lauri/Personal/kurkelo/docs/LIMITS.md) confirms approximate, eventually consistent counters per Cloudflare location; these are not strict global budgets or concurrency reservations. Cache hits consume caller allowance but avoid hostname HTTP-attempt limits.

Existing shared keys remain compatible and share a legacy allowance. Optional server-configured app-specific keys can separate Shitemap/Advisor allowances; none were provisioned here. HTTP caller throttling uses 429/Retry-After, while hostname throttling retains collector blocked/partial semantics. Shitemap preserves service 429/retry guidance and collector status.

Explicit allowlisted local targets work only in Kurkelo development. No Durable Objects or billing changes were introduced. Caller/domain quota and compatible retry work are delivered for this approximate scope. Connection enforcement, cold-miss coordination, failure cooldowns, and full usage measurement remain distinct items unless separately verified.

## Current integration and ownership

Deployed Shitemap 0.4.2 calls `POST /api/discover` server-side with `{ target, include: ['sitemaps'], detail: 'compact' }`, using `KURKELO_URL` and an optional server-held bearer key. It consumes `site.sitemaps` and `site.status.sitemaps`, offers multiple locations, and then expands XML itself. Older Kurkelo documentation saying Shitemap is not wired should be updated.

Kurkelo remains responsible for website discovery, protected external HTML fetching, metadata extraction, identity, and cache/freshness. Shitemap owns XML inventory extraction, graph presentation, browser controls, export, and error presentation. ADvisor currently has its own discovery/profile-ID resolvers; adopting Kurkelo there remains separate work, not an implemented integration.

Existing exact-page support is sufficient for the first unfurling feature:

```json
{ "target": "https://example.com/a-page", "include": ["metadata"], "detail": "compact" }
```

Shitemap release 0.4.3 requests only selected real pages through `/api/metadata`, with a 350 ms selection debounce, shared in-flight work, a bounded five-minute map-local cache, and retry cooldowns. It consumes `page` from the existing compact response and keeps the bearer key server-side. Images are automatically hotlinked in the browser; there is no server image proxy. Hosted verification is pending; see [METADATA.md](METADATA.md). No Kurkelo API changes are required for this first slice. No automatic whole-map unfurling, batch/jobs endpoint, browser rendering, screenshots, or new inventory API is requested now.

## Original service targets and remaining review

| Priority | Requirement | Acceptance evidence |
| --- | --- | --- |
| Release | Close public-DNS-preflight/connection enforcement gap | Document supported Workers enforcement or protected fetch architecture; test private destinations, DNS changes, and each redirect. Another preflight alone is insufficient. |
| Delivered for current scope | Authenticated caller budgets | Native 20/10s and 60/minute per-location counters deployed. Strict global accounting/distributed concurrency are outside the agreed scope. Dedicated consumer credentials remain to be provisioned. |
| Delivered for current scope | Shared per-hostname limits | Native per-location HTTP-attempt limits cover callers, redirects, and fallbacks; cache hits avoid hostname checks. Limits are approximate, not a strict global origin budget. |
| Delivered | Stable throttling and failure semantics | Service 429/Retry-After and collector blocked/partial states are implemented; Shitemap preserves retry guidance. |
| Evaluate with metadata | Coalesce cold misses | Simultaneous exact-page/collector cache misses share bounded work, not just stale refreshes in one isolate. Document guarantees if coordination is best effort. |
| Evaluate with metadata | Brief failure cooldowns | Repeated timeout/blocked/upstream-429 requests do not repeatedly fetch the source. TTL depends on failure type and upstream retry guidance; preserve successful stale evidence. |
| Alongside hardening | Request/collector/upstream measurement | Counts and durations distinguish cache hits, stale/background refresh, actual HTML/XML/DNS/HEAD attempts, redirects/retries, throttling, and failures. Instrument real network attempts, not inferred fanout. |

Prefer server-controlled consumer identities/credentials for `shitemap`, `advisor`, and Kurkelo's own UI. A client-supplied app-name header is not authority for quotas. Do not forward these credentials or caller authorization to inspected websites.

The native shared, approximate per-location counters satisfy the agreed initial quota scope. Strict global budgets, distributed reservations, and additional policy layers are not current requirements. A dedicated Shitemap key is agreed in principle and waits for Kurkelo key provisioning. No paid storage or billing changes are requested by this handoff.

## API compatibility and correlation

- Preserve existing compact/full responses, selective collectors, `site.id`/`page.id`, observation dates, partial states, stale evidence, and exact-page/site distinction.
- Keep the existing response `requestId`. Agree a bounded validated correlation-header convention between consumer and Kurkelo; generated service request IDs remain distinct from the parent operation ID. This is proposed, not a current supported header.
- Return request IDs and stable error codes on quota rejection and other pre-report failures too. Treat full diagnostic response data as a deliberate option, not mandatory payload growth for ordinary consumers.
- Separate service-owned quotas from upstream website throttling in error codes. Do not reinterpret a source's HTTP 429 as a caller quota violation.
- Preserve secret/query-bearing URL cache restrictions. Redact URLs before logs/error reporting too; cache restrictions alone do not prevent telemetry disclosure.
- Cache metadata by exact identity/settings; do not collapse distinct query-bearing pages or use a canonical declaration as permission to merge observations.
- Update API docs, OpenAPI, consumer client helpers, and integration examples together when behavior changes. Do not introduce an unversioned breaking envelope change.

## Service metrics versus app usage

Use [OPERATIONS.md](OPERATIONS.md) as a proposed common vocabulary. Kurkelo owns authoritative upstream-attempt and cache/collector counters; consumers own their public requests and UI outcomes. A Shitemap operation can generate multiple Kurkelo and website requests: report each level separately rather than summing them as users/actions.

Track background refreshes as service work even after the original response returned. Metric dimensions must be bounded; exclude raw targets, path/query values, source HTML, credentials, and stable end-user IDs. Return only useful status/correlation to ordinary clients; a public administrative metrics endpoint is not requested.

## Error reporting

Centry is the proposed error destination. Its existing client has browser, Worker, and Node/serverless entry points; the old Centry planning note saying Node support does not exist is historical. Verify the currently published/runtime-compatible build before integration.

Kurkelo should capture unexpected exceptions and internal dependency failures, with environment/release, collector, operation/request IDs, and scrubbed context. Expected no-sitemap/no-metadata/blocked/rate-limited outcomes belong in operational counters, not an error event per request. Reporting must be bounded and must not break discovery or recursively report its own transport failures.

## Remaining sequence

1. Review/document the connection-enforcement question separately from the delivered quotas.
2. Provision a dedicated Shitemap credential when Kurkelo key setup is ready.
3. Support selected-page metadata with request reuse; evaluate cold-miss duplication and cooldowns from actual usage.
4. Add useful request/fetch measurement and optional Centry reporting incrementally. No new monitoring platform or multiple Shitemap quota policies are required now.

Notify the user of what is implemented versus still proposed. Coordinate Shitemap consumer changes against the verified contract; do not deploy or provision services solely because of this handoff.
