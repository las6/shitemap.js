# Shitemap delivery plan

Updated October 9, 2026. Source/live version 0.4.1. Browser/export evidence is in [VERIFICATION.md](docs/VERIFICATION.md). Supersedes the Groups/Flat/ELK plan; historical exploration remains in [IDEAS.md](IDEAS.md). Implemented hardening and deployment requirements are in [HARDENING.md](docs/HARDENING.md).

Status: `[x]` implemented, `[-]` partial/pending verification, `[ ]` planned. Source status is not evidence of production deployment.

## Current status

- [x] Website/domain input calls Kurkelo server-side for sitemap locations; multiple locations offer a choice. Direct XML and the bundled fixture work without discovery.
- [x] XML syntax/root checking, index expansion, usable URL validation/deduplication, partial-child warnings, cancellation/timeouts, and retryable shared-link errors.
- [x] Regular/Bare deterministic tree views, independent direction/detail, collections, stable collapse, search, branch focus, page details, and presentation.
- [x] Shareable view/direction/detail parameters and selected-page hash. Links reload source data; they are not persisted snapshots of every expanded branch.
- [x] Recursive/Doto typography, system/light/dark themes, favicons, author link, and subtle package-version labels.
- [x] Appearance controls are committed in `6cfd8e8`: textures, visibility, reflection contrast, isometric treatment, and optional map backgrounds. Fuchsia controls/effects are development-only, including persisted debug preferences. Production appearance verification is pending.
- [x] The deployed hardening snapshot passed 137 tests, lint, local production build, and hosted build on October 9. Concurrent uncommitted appearance changes were excluded; they need their own final verification.
- [x] Protected sitemap destinations, aggregate XML/document/page/node budgets, bounded parsing structure, and a global index traversal queue.
- [x] Shared Vercel quota guard and live `shitemap-api` rule verified: 20 calls/minute per client-IP key per region, shared across APIs. No in-memory fallback allows unguarded production calls.
- [x] PNG/native SVG export and image clipboard copying are deployed in 0.4.1; hosted example and actual export/copy smoke checks passed.
- [ ] Usage instrumentation and page metadata integration.
- [-] Hosted hardening build, discovery, direct XML, blocked destinations, and shared 429/retry behavior verified. Hosted shared-link reload/search and local synthetic browser capacity checks completed; cross-browser/device and hosting load checks remain.

## Practical next steps and scope

Keep the current single Shitemap allowance of 20 API executions/minute/IP. Separate metadata buckets, additional burst policies, and a quota-management layer are not agreed requirements. Revisit the allowance when selected-page metadata exists and real usage shows a problem; browser reuse/debouncing should prevent unnecessary calls.

A dedicated Shitemap Kurkelo credential is agreed in principle but not provisioned. The current legacy key still works and shares its allowance with other consumers. Arrange that migration with Kurkelo when its key setup is ready.

Focused browser/shared-link and synthetic capacity review plus PNG/SVG export are complete in source; 0.4.1 is deployed; check real devices/hosting capacity. Selected-page unfurling follows export. Basic operational measurement can grow alongside these; a new analytics platform or Centry integration is not a beta prerequisite.

## Service boundary and data flow

Browser → Shitemap `/api/discover` → Kurkelo discovery → candidate XML locations.

Browser → Shitemap `/api/sitemapper` → XML/index downloads and server parsing → URL inventory JSON → browser tree construction, layout, and React Flow rendering.

Kurkelo discovers locations and collects exact-page HTML metadata; it does not currently expand sitemap indexes into a page inventory. Shitemap owns extraction, visualization, limits, and user-facing states. Discovery results do not exempt later fetches from destination validation.

## 1. Release hardening — Shitemap

- [-] Synthetic small/broad/deep/10,000-page/10-MiB fixtures and adversarial index/compression tests run locally. Functional browser fixtures now cover 10,000 grouped pages and 500 top-level branches; cross-browser capacity and deployed memory/concurrency measurements remain; sampled Node RSS is not an isolated peak measurement.
- [x] Protected fetch adapter validates initial/child/redirect URLs and DNS addresses, then pins the connection with TLS verification. The development local fixture is read from its bundled file, without network exceptions.
- [x] One bounded traversal queue controls concurrency, cycles, nesting, file/page totals, URL length, and inferred graph nodes.
- [x] Streaming download/decompression limits and XML depth/element bounds precede parsing. Deadline checks surround parsing, but cannot preempt synchronous parser CPU; production measurements determine whether isolation is needed.
- [x] Both APIs enforce the published shared Vercel quota rule; live 429/retry guidance verified. Missing/unavailable checks return 503 in local tests. Discovery request and service-response bodies are bounded.
- [x] Structured errors distinguish blocked destinations, resource limits, timeout, and throttling. Ordinary child failures retain incomplete-map warnings; limit failures return no truncated inventory.
- [x] Landing/shared-link errors offer child sitemap choices discovered before a limit failure.

Provisional starting budgets, subject to benchmarks:

| Resource | Proposed budget | Current behavior |
| --- | --- | --- |
| Individual XML | 10 MiB, including decompression bounds | Implemented per document |
| Aggregate downloaded/decompressed XML | 20 MiB each | Implemented as separate wire/final decoded counters |
| Sitemap documents | 50 | Implemented |
| Unique usable page URLs | 10,000 | Implemented |
| Concurrent XML downloads | 3 across entire traversal | Implemented global scheduler |
| Operation deadline | 45 seconds | Abort + elapsed checks; does not preempt synchronous CPU |
| Index nesting / URL path depth | 8 / 32 | Implemented |
| XML nesting / elements | 64 / 200,000 | Checked before parsing |
| Generated page/folder nodes | 15,000 | Server and browser tree guard |
| First-level branches | 500 | Fail before browser layout; preserves existing all-first-level presentation within the supported budget |

An absolute visible-node budget during interactive expansion remains to be evaluated in browser capacity tests. These starting budgets are not performance guarantees.

Acceptance: unsafe redirect/child destinations are blocked; nested indexes stay within global budgets; cyclic/oversized inputs terminate predictably; ordinary maps remain usable; completeness is explicit.

## 2. Release hardening — Kurkelo (separate repository)

See [KURKELO_HANDOFF.md](docs/KURKELO_HANDOFF.md) for API requirements and acceptance criteria.

- [ ] Resolve the documented DNS preflight/connection gap with an enforceable runtime-specific design.
- [x] Native authenticated caller and hostname rate limits deployed: 20/10 seconds and 60/minute, approximately enforced per Cloudflare location. Cache hits avoid hostname HTTP-attempt limits.
- [x] Compatible HTTP 429/retry guidance and collector blocked/partial states delivered. Cross-service parent correlation remains proposed.
- [ ] Provision a dedicated Shitemap key when Kurkelo key setup is ready; existing shared-key compatibility remains.
- [ ] Evaluate duplicate cold-miss work and failure cooldowns with metadata usage; distributed concurrency/global accounting are not current scope.
- [ ] Measure API calls, collector executions, and actual upstream attempts separately, with bounded telemetry/storage costs.

No batch collector or sitemap-inventory API is required for the first Shitemap integration. Billing activation, paid subscriptions, and deployment are not implied by this plan.

## 3. Measurement and deployed release verification

- [ ] Adopt [OPERATIONS.md](docs/OPERATIONS.md): begin with server outcome/duration/cache/fetch counts and a small browser completion/feature-event pilot.
- [ ] Choose retention and a collection sink using existing platform capabilities before adding an analytics service. Measurement is best effort; authoritative quota enforcement is separate.
- [-] Deployed discovery, direct XML, blocked destinations, and shared throttling verified. Shared-link reload/search, local cancellation, Unicode/long labels, responsive controls and synthetic large maps reviewed. Broader browser partial-index/retry and physical-device checks remain.
- [ ] Verify server-held Kurkelo credentials and production-disabled diagnostics.
- [-] Hardening tests/lint/build and deployment evidence recorded in HARDENING.md. Re-run after concurrent appearance work; complete browser/request-amplification review.

Centry is the proposed small error-reporting integration, not a requirement to build a new monitoring platform before beta. Structured logs must still make unexpected service failures diagnosable.

## 4. PNG/SVG export and image clipboard — deployed 0.4.1

- [x] Export the currently expanded map beyond viewport clipping, with current view/direction/detail and solid-theme/transparent background choice.
- [x] Exclude controls, inspector, highlights, diagnostics, textures and branding.
- [x] Native SVG geometry/text embeds local fonts; PNG uses the loaded fonts and caps dimensions/pixel count. Export work is bounded; see VERIFICATION.md.
- [x] Exclude remote metadata thumbnails.
- [x] Local downloads verified for Regular/Bare, both directions, long/Unicode labels, stacks, themes, collapsed branches and large-map output.
- [x] Deploy 0.4.1 and smoke-check PNG, SVG, and clipboard copying.
- [ ] Verify real devices/other browsers.

Acceptance: output matches the chosen structure, has no clipped labels/chrome, and explains raster size limits.

## 5. Selected-page metadata — after export

- [ ] Add a server proxy calling Kurkelo with `include: ['metadata']`, `detail: 'compact'`; never expose the bearer key.
- [ ] Request only a selected real page, debounce changes, deduplicate work, and reuse results. Opening a graph makes zero page-metadata requests.
- [ ] Show observed title/description/optional image and status/date in the details panel. Missing OG values and client-rendered-only tags are normal unavailable states.
- [ ] Preserve URL-derived labels, source URL identity, and geometry initially. Inferred folders have no fetchable page.
- [ ] Retain existing details on failure; validate links/images and provide image fallbacks. Image proxying must not introduce an unprotected fetch path.
- [ ] Keep the single API allowance initially; tune only after measuring selected-page usage and throttling. No automatic prefetch or bulk enrichment is planned.

## Deferred

Whole-map metadata, batch/jobs APIs, rendered screenshots, editing/saved snapshots, authenticated GSC/analytics joins, and metrics-driven spatial views. App usage measurement is distinct from importing a target site's analytics into its graph.
