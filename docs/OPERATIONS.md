# Usage measurement and error reporting

Proposal dated October 9, 2026 for Shitemap, Kurkelo, and ADvisor. This is operational/product measurement, not a marketing analytics project. No analytics SDK, shared event collector, storage service, or Centry integration has been added to Shitemap by this documentation work.

Current scope: keep the single Shitemap API allowance and existing Kurkelo native limits. Additional feature-specific quota policies and a quota-management layer are not agreed requirements. Dedicated Shitemap credentials are planned when Kurkelo provisioning is ready. Start measurement with useful platform views and small server summaries; the event schema below is a proposal, not a requirement to implement every field before beta.

## Questions to answer

- How many user operations finish, fail, time out, or are cancelled?
- How many public API requests, collector executions, and actual upstream requests does each operation cause?
- How much work is served from cache, and how much occurs in stale/background refreshes?
- Which map sizes, views, search, presentation, and exports are useful? Where do users stop before a map becomes usable?
- What do median/tail latency, bytes, throttling, and error rates look like per app and release?

Do not infer unique people from request counts. Begin with aggregate counts and optional short-lived session-level completion; cross-app person tracking and long-lived identifiers are unnecessary for these questions.

## Three measurement levels

| Level | Owner | First observations |
| --- | --- | --- |
| User operation/UI outcome | Shitemap, ADvisor, Kurkelo UI | Operation started/completed/failed/cancelled; map ready; feature used |
| API/service work | Each API | Route/collector, outcome/error code, status, duration, throttling, cache state, release/environment |
| Upstream network work | Service making the fetch | Purpose, actual attempts, redirects/retries, bytes, duration, timeout/block status, parent operation |

A Shitemap discovery followed by an XML load is one exploration with at least two API calls and potentially many network attempts. Never sum these levels into a “users” metric. A cache hit can mean no website fetch; background refresh can mean work after the response. Count DNS and metadata image fetches separately if present. Cache hits in an edge layer may bypass application instrumentation: compare with platform request counts and document coverage.

Quota enforcement uses platform-owned counters: Vercel buckets are per region and Kurkelo native counters are approximate/per location. Neither provides strict global accounting. Sampled logs or best-effort browser events cannot enforce quotas or establish billing totals.

## Small common event contract

Version the schema and use a bounded allowlist of fields:

- `schemaVersion`, `event`, timestamp, `app` (`shitemap`, `kurkelo`, `advisor`), release, environment, and runtime.
- Ephemeral `operationId`, service-generated `requestId`, and optional parent request ID for correlation. These are diagnostics, not metric labels or user identities.
- Route template/collector/fetch purpose, outcome, stable error code, status, duration, cache state, and numeric counts/bytes where applicable.
- UI dimensions such as Regular/Bare, direction, input kind (`domain`, `xml`, `fixture`), and bucketed map size. Never record entered text or search queries.

Server-owned app identity comes from configuration/authentication. Do not trust browser fields to determine caller budgets. Avoid raw hosts/paths as aggregate dimensions; per-domain enforcement can keep internal normalized keys without exporting them into analytics. Cap event payloads, queue sizes, retries, and field lengths.

Shitemap pilot events: `exploration_started`, `exploration_completed` (graph ready, not merely API success), `exploration_failed`, `exploration_cancelled`, and bounded `feature_used` values for search, view/direction change, presentation, and later export. Distinguish submitted operations from example fixtures. Emit at meaningful transitions, not on every render/pan/zoom/pointer movement. Browser completion is best effort, so don't treat missing terminal events as confirmed failures.

ADvisor pilot: discovery started/completed/failed, resolver outcome by platform, cache/fallback usage, and ad-library shortcut opened. Current ADvisor still owns homepage/profile/ID resolution and its authenticated PHP fallbacks; measure those actual calls, not a hypothetical Kurkelo integration. Do not log company input, profile slugs, advertiser IDs, or resolver credentials.

## Collection, cost, and privacy

1. Inventory existing hosting request/log/analytics facilities. Start with structured server summaries and basic aggregates rather than deploying a new analytics product immediately.
2. Choose a small compatible sink for browser pilot events and server aggregates; record the decision, access controls, event/body limits, retention, and cost budget before implementation. No vendor/storage choice is settled here.
3. Keep counters where requests occur. Use summaries or sampling for detailed traces; avoid turning each upstream request into another synchronous remote API call. Batch with bounded memory/transport and runtime-appropriate background handling.
4. If raw events are needed, propose seven days of diagnostic retention and 30 days of daily aggregates initially; confirm operational needs before activation. Protect dashboard access and define cleanup. This retention is proposed, not provisioned.
5. Scrub before transport. Exclude credentials, headers/cookies, source HTML, OG text/images, entered URLs, query strings, searches, raw IPs, and persistent identity. Shitemap's encoded sitemap URL in `/view/[url]` and selected-page hash must also be redacted; removing only the query is insufficient.
6. Avoid fingerprinting and cross-app persistent identifiers. Separate dev/fixture traffic from production aggregates. Tracking should not affect normal app operation when blocked or unavailable.

Expected request quotas and telemetry-ingest abuse limits are separate. A browser collector needs its own allowlisted schema, bounded ingestion, and rate protection. Do not add a public dashboard or silently enable tracking as part of documentation changes.

## Centry for errors

Use Centry for unexpected errors; keep service health/usage aggregates in the operational measurement path. It does not need to become a general analytics database.

Verified in the local client source: browser `centry-client`, Worker `centry-client/worker`, and Node/serverless `centry-client/node` targets exist, with environment/release tagging. Worker and Node wrappers support request context; Node/serverless supports flushing before the handler returns. Verify package availability, context scrubbing, source maps, flush time budget, and framework compatibility before adoption.

Proposed projects: separate Shitemap, Kurkelo, and ADvisor projects, with release/environment and ephemeral correlation IDs. No projects or credentials have been created. Wire Shitemap browser plus API boundaries, Kurkelo Worker, and ADvisor Worker; review its PHP resolver separately if needed.

Capture unhandled browser failures, internal server exceptions, and unexpected dependency failures. Ordinary malformed input, missing metadata/sitemaps, source blocks, supported limit states, user cancellation, and quota rejection are outcomes/counters rather than an error event for each occurrence. Spikes in those outcomes can still be operationally meaningful.

Disable or segregate development reporting; deduplicate/rate-limit repeated errors; scrub context before SDK transport; exclude telemetry's own endpoints from recursive error capture. Failure to report must never prevent discovery, graph use, or export. A Centry outage should leave only bounded local logging, not an endless retry queue.

## Delivery sequence and checks

- [ ] Define event/error vocabulary and correlate Shitemap exploration across discovery, XML loading, and graph-ready state.
- [ ] Add small server measurements alongside hardening; confirm cached/background/redirected work is counted correctly.
- [ ] Choose the sink and pilot minimal UI events in Shitemap; extend the same contract to Kurkelo and ADvisor in their own work.
- [ ] Add lightweight Centry integration after verifying SDK/runtime behavior. Keep it optional to beta timing unless diagnosis is otherwise inadequate.
- [ ] Verify concurrent operations, cancellation, cache hits/misses/refreshes, source HTTP 429 versus service quota rejection, unavailable collectors, and delivery failures.
- [ ] Inspect real payloads for secrets/URLs/encoded paths; confirm bounded volume and separate dev/production reporting.
- [ ] Create only the few useful views: daily operations and completion, latency/error rates, upstream requests per operation, cache efficiency, and feature use. Expand after observing usage.

This plan measures our apps. Search Console/analytics data from websites being mapped remains a different, deferred feature with its own authentication and data boundaries.
