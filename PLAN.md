# Shitemap delivery plan

Updated October 9, 2026. Version 0.3.0. Supersedes the Groups/Flat/ELK plan; historical exploration remains in [IDEAS.md](IDEAS.md).

Status: `[x]` implemented, `[-]` partial/pending verification, `[ ]` planned. Source status is not evidence of production deployment.

## Current status

- [x] Website/domain input calls Kurkelo server-side for sitemap locations; multiple locations offer a choice. Direct XML and the bundled fixture work without discovery.
- [x] XML syntax/root checking, index expansion, usable URL validation/deduplication, partial-child warnings, cancellation/timeouts, and retryable shared-link errors.
- [x] Regular/Bare deterministic tree views, independent direction/detail, collections, stable collapse, search, branch focus, page details, and presentation.
- [x] Shareable view/direction/detail parameters and selected-page hash. Links reload source data; they are not persisted snapshots of every expanded branch.
- [x] Recursive/Doto typography, system/light/dark themes, favicons, author link, and subtle package-version labels.
- [x] Appearance controls are committed in `6cfd8e8`: textures, visibility, reflection contrast, isometric treatment, and optional map backgrounds. Fuchsia controls/effects are development-only, including persisted debug preferences. Production appearance verification is pending.
- [x] During this review, 82 tests, lint, and production build passed before the final appearance commit. Re-run for the final release; this is a dated observation, not a permanent test count.
- [ ] Protected destinations, aggregate resource budgets, public API quotas, usage instrumentation, exports, and page metadata integration.
- [ ] Deployed discovery/reload/error-path verification for the hardened release.

## Service boundary and data flow

Browser → Shitemap `/api/discover` → Kurkelo discovery → candidate XML locations.

Browser → Shitemap `/api/sitemapper` → XML/index downloads and server parsing → URL inventory JSON → browser tree construction, layout, and React Flow rendering.

Kurkelo discovers locations and collects exact-page HTML metadata; it does not currently expand sitemap indexes into a page inventory. Shitemap owns extraction, visualization, limits, and user-facing states. Discovery results do not exempt later fetches from destination validation.

## 1. Release hardening — Shitemap

- [ ] Benchmark small, broad, deep, indexed, compressed, and oversized fixtures. Record server memory/parse time and browser inventory/layout responsiveness; bytes alone do not establish renderability.
- [ ] Introduce a protected fetch adapter: validate initial/child/redirect URLs, public destinations, and supported ports; bind connections to validated addresses while retaining hostname-based TLS verification. Allow local fixtures only by explicit development exception.
- [ ] Replace recursive library scheduling with a bounded traversal queue and global counters. Bound cycles, nesting, URL length, and inferred nodes too. Nested indexes must share one concurrency budget.
- [ ] Bound streaming downloads and decompression; Content-Length is only an early check. AbortSignal cannot interrupt synchronous XML parsing: benchmark CPU separately and decide whether isolation is needed.
- [ ] Add public API quotas with hosting controls/shared state, not process-local counters. Bound discovery request bodies and future metadata requests too.
- [ ] Define error codes for blocked destinations, resource limits, timeout, and throttling. Preserve usable pages with incomplete-map warnings for ordinary child failures; do not silently truncate a complete-looking map.
- [ ] Offer individual child sitemaps when an index exceeds budgets and safe candidates are available.

Provisional starting budgets, subject to benchmarks:

| Resource | Proposed budget | Current behavior |
| --- | --- | --- |
| Individual XML | 10 MiB, including decompression bounds | Implemented per document |
| Aggregate decompressed XML | 20 MiB | Not implemented |
| Sitemap documents | 50 | Not implemented |
| Unique usable page URLs | 10,000 | Not implemented |
| Concurrent XML downloads | 3 across entire traversal | Library scheduling is per index |
| Network deadline | 45 seconds | Implemented; does not interrupt synchronous parsing/layout |
| Nesting/generated/visible nodes | Select from benchmarks | No explicit budgets |

Acceptance: unsafe redirect/child destinations are blocked; nested indexes stay within global budgets; cyclic/oversized inputs terminate predictably; ordinary maps remain usable; completeness is explicit.

## 2. Release hardening — Kurkelo (separate repository)

See [KURKELO_HANDOFF.md](docs/KURKELO_HANDOFF.md) for API requirements and acceptance criteria.

- [ ] Resolve the documented DNS preflight/connection gap with an enforceable runtime-specific design.
- [ ] Add authenticated caller quotas, shared per-domain concurrency/rate controls, cold-miss deduplication, and short failure cooldowns.
- [ ] Define throttling/error/correlation behavior without breaking compact responses.
- [ ] Measure API calls, collector executions, and actual upstream attempts separately, with bounded telemetry/storage costs.

No batch collector or sitemap-inventory API is required for the first Shitemap integration. Billing activation, paid subscriptions, and deployment are not implied by this plan.

## 3. Measurement and deployed release verification

- [ ] Adopt [OPERATIONS.md](docs/OPERATIONS.md): begin with server outcome/duration/cache/fetch counts and a small browser completion/feature-event pilot.
- [ ] Choose retention and a collection sink using existing platform capabilities before adding an analytics service. Measurement is best effort; authoritative quota enforcement is separate.
- [ ] Verify deployed discovery, direct XML, indexes, Unicode/shared links, cancellation, retries, partial warnings, limits, and mobile/large-map behavior.
- [ ] Verify server-held Kurkelo credentials and production-disabled diagnostics.
- [ ] Re-run tests/lint/build; review browser errors and request amplification. Record deployment version and verification date.

Centry is the proposed small error-reporting integration, not a requirement to build a new monitoring platform before beta. Structured logs must still make unexpected service failures diagnosable.

## 4. PNG/SVG export — next user-facing feature

- [ ] Export the currently expanded map, independent of viewport clipping, using current view/direction and an explicit background choice.
- [ ] Exclude controls, inspector, selection highlights, and diagnostics; decide whether subtle branding is included.
- [ ] Preserve geometry, connectors, labels, and fonts; SVG must include required styles/assets and PNG must bound dimensions/pixel count.
- [ ] Exclude remote metadata thumbnails initially.
- [ ] Verify Regular/Bare, both directions, long labels, stacks, themes, collapsed branches, and large-map output.

Acceptance: output matches the chosen structure, has no clipped labels/chrome, and explains raster size limits.

## 5. Selected-page metadata — after export

- [ ] Add a server proxy calling Kurkelo with `include: ['metadata']`, `detail: 'compact'`; never expose the bearer key.
- [ ] Request only a selected real page, debounce changes, deduplicate work, and reuse results. Opening a graph makes zero page-metadata requests.
- [ ] Show observed title/description/optional image and status/date in the details panel. Missing OG values and client-rendered-only tags are normal unavailable states.
- [ ] Preserve URL-derived labels, source URL identity, and geometry initially. Inferred folders have no fetchable page.
- [ ] Retain existing details on failure; validate links/images and provide image fallbacks. Image proxying must not introduce an unprotected fetch path.
- [ ] Measure upstream work/cache behavior before prefetch or bulk enrichment.

## Deferred

Whole-map metadata, batch/jobs APIs, rendered screenshots, editing/saved snapshots, authenticated GSC/analytics joins, and metrics-driven spatial views. App usage measurement is distinct from importing a target site's analytics into its graph.
