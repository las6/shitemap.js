# Kurkelo API handoff from Shitemap

Consumer request dated October 9, 2026. Requirements below are proposals to implement in the separate Kurkelo repository, not claims about the deployed API. Related: [delivery plan](../PLAN.md), [operations](OPERATIONS.md).

## Current integration and ownership

Shitemap 0.3.0 now calls `POST /api/discover` server-side with `{ target, include: ['sitemaps'], detail: 'compact' }`, using `KURKELO_URL` and an optional server-held bearer key. It consumes `site.sitemaps` and `site.status.sitemaps`, offers multiple locations, and then expands XML itself. Older Kurkelo documentation saying Shitemap is not wired should be updated.

Kurkelo remains responsible for website discovery, protected external HTML fetching, metadata extraction, identity, and cache/freshness. Shitemap owns XML inventory extraction, graph presentation, browser controls, export, and error presentation. ADvisor currently has its own discovery/profile-ID resolvers; adopting Kurkelo there remains separate work, not an implemented integration.

Existing exact-page support is sufficient for the first unfurling feature:

```json
{ "target": "https://example.com/a-page", "include": ["metadata"], "detail": "compact" }
```

Shitemap will fetch only selected real pages. No automatic whole-map unfurling, batch/jobs endpoint, browser rendering, screenshots, or new inventory API is requested now.

## Required service work

| Priority | Requirement | Acceptance evidence |
| --- | --- | --- |
| Release | Close public-DNS-preflight/connection enforcement gap | Document supported Workers enforcement or protected fetch architecture; test private destinations, DNS changes, and each redirect. Another preflight alone is insufficient. |
| Release | Authenticated caller budgets and global protection | Server-verified caller identity, sustained/burst request caps and bounded concurrent work. One public consumer cannot exhaust the service through its valid key. |
| Release | Shared per-domain limits | Requests from different callers/instances share an effective origin budget, including redirects and retries. Verify with concurrent load. |
| Release | Stable throttling and failure semantics | API-level quota rejection uses HTTP 429 and `Retry-After`; collector-specific blocked/partial/failure states retain the existing report contract. Shitemap can show a retry state without interpreting string messages. |
| Before metadata | Coalesce cold misses | Simultaneous exact-page/collector cache misses share bounded work, not just stale refreshes in one isolate. Document guarantees if coordination is best effort. |
| Before metadata | Brief failure cooldowns | Repeated timeout/blocked/upstream-429 requests do not repeatedly fetch the source. TTL depends on failure type and upstream retry guidance; preserve successful stale evidence. |
| Alongside hardening | Request/collector/upstream measurement | Counts and durations distinguish cache hits, stale/background refresh, actual HTML/XML/DNS/HEAD attempts, redirects/retries, throttling, and failures. Instrument real network attempts, not inferred fanout. |

Prefer server-controlled consumer identities/credentials for `shitemap`, `advisor`, and Kurkelo's own UI. A client-supplied app-name header is not authority for quotas. Do not forward these credentials or caller authorization to inspected websites.

Rate-limit controls need bounded/shared enforcement across instances; isolate-local maps are an optimization, not a service-wide guarantee. Choose runtime/storage mechanisms explicitly. No paid storage, billing changes, or deployment are requested by this handoff.

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

## Suggested delivery chunks

1. Document connection enforcement and caller/quota decisions; add policy/load fixtures.
2. Implement service and domain quotas plus compatible errors/retry behavior.
3. Add cold-miss coordination/failure cooldowns and tests for concurrent requests, stale refresh, and failed refresh retention.
4. Add request/fetch measurement, then optional Centry reporting; update API/client docs and provide verified examples to Shitemap.

Notify the user of what is implemented versus still proposed. Coordinate Shitemap consumer changes against the verified contract; do not deploy or provision services solely because of this handoff.
