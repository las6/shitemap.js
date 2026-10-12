# Selected-page metadata — updated October 12, 2026

Included in release 0.4.3, submitted through the main-branch Vercel Git deployment. The last separately verified hosted version is 0.4.2.

## Behavior and service contract

Selecting a real page requests its observed title, description and optional image in Page details. Opening a map without a selection and selecting an inferred folder make zero requests. URL-derived node labels, page identity and geometry stay unchanged. Missing tags, partial results, blocked pages and failures have explicit states. This collects source HTML tags; client-rendered tags and rendered screenshots are outside scope.

`POST /api/metadata` calls Kurkelo `POST /api/discover` with `{ target, include: ['metadata'], detail: 'compact' }`. The existing `KURKELO_URL` and server-only `KURKELO_API_KEY` are reused. No service API change, batch endpoint, new credentials or billing change is required. A dedicated Shitemap key remains a separate provisioning item.

The proxy uses the existing fail-closed Vercel allowance of 20 API executions/minute/IP, shared with discovery and XML loading. Service HTTP 429 preserves bounded Retry-After guidance; collector blocked/failed reports remain distinct metadata states. No automatic retries or whole-map prefetch are added.

## Request reuse and bounds

- Uncached selection waits 350 ms; changing/closing details cancels unused work. Concurrent reads share a request.
- Each open map keeps up to 100 entries in memory for five minutes. Exact paths and queries remain distinct; fragments are removed. No persistent browser storage is used.
- Failed responses have a 30-second cooldown unless bounded service/collector retry guidance is supplied. Earlier successful evidence survives failed refreshes and is marked stale.
- Request JSON is limited to 4 KiB and five seconds; Kurkelo response is limited to 256 KiB and the operation to 30 seconds.
- Targets and publisher links reject credentials, unsupported schemes/ports, IP literals and local/reserved hostnames. Kurkelo remains responsible for DNS, redirect and actual external-fetch enforcement. Only bounded display fields reach the browser; raw HTML and diagnostics are omitted.

The preview places the image above the observed title/description, below the page identity and controls. Text and status use their natural height. Loading uses decorative skeletons and accessible status text; loaded content does not retain oversized empty text/status slots.

Images load automatically in the browser with no referrer. The entire image links to the selected page, with an external-link indicator; no separate Show image button or Open image row is needed. A common OG ratio of 1200:630 reserves space while loading; once decoded, the frame uses the image’s intrinsic ratio, preserving the full image without letterboxing or cropping. Sources with another ratio can resize once on decode because the compact Kurkelo response does not supply dimensions. Missing/failed images keep a placeholder, and failures retain a link to the selected page.

Shitemap does not fetch/proxy remote images server-side. Browser image requests go directly to the image host. Export omits the details panel and remote images.

## Verification and remaining work

171 tests pass, including selective compact requests, server-held authorization, shared quota enforcement, body/response limits, public URL validation, sanitized output, service/collector throttling, cache bounds, exact queries, cancellation and stale evidence. Lint and the production Turbopack build pass.

Browser review verified no request on an unselected map/inferred folder, loading and safe failure/retry states, and successful title/description/date from controlled HTML through the real Kurkelo parser/handler. One selection produced one metadata request and zero remote image requests before the explicit image action; broken-image fallback appeared after that action. Selecting an inferred folder then reselecting the original page left the request count at one, confirming browser cache reuse. The earlier fixed-slot skeleton review measured stable dimensions, but those fixed text/status heights were subsequently removed because they produced excessive blank space. Temporary fixture routes are removed from the source before build.

Real public metadata now passes through the running local Shitemap proxy and deployed Kurkelo: Vite’s `/guide/` returns `ok`, “Getting Started”, description and image; Next.js `/docs` returns `ok`, “Next.js Docs | Next.js”, description and image. An isolated browser preview using the same consumer configuration also displayed Vite’s real title/description and successfully loaded `https://vite.dev/og-image.jpg` after the image action. The original running development page stalled before issuing its sitemap request during this browser session; this isolated check confirms the metadata UI/service path, not that unrelated development-page loading behavior.

The initial local failure was a configuration mismatch: Shitemap had no `KURKELO_URL` or bearer key, so its development fallback reached an unrelated Worker on port 8787. The existing ignored Kurkelo consumer configuration was verified against the deployed service and reused in Shitemap’s ignored `.env.local`, without displaying or changing credentials. Isolated Worker/Node public-fetch failures recorded earlier were separate local-runtime observations; they did not establish a deployed Kurkelo failure.

For local development, set both `KURKELO_URL` and `KURKELO_API_KEY` from the existing consumer configuration when using hosted Kurkelo. If running Kurkelo locally, verify `/api/health` identifies Kurkelo and set an explicit free port when 8787 is occupied. An open port alone does not identify the service. Restart the app if environment changes are not picked up, and reselect/reload a page to clear a cached failure cooldown.

Hosted Shitemap proxy verification remains pending. On October 12, the user authorized versioning, commits and the main push while explicitly skipping further testing and smoke checks. The earlier readiness review on that date passed 171 tests, lint and production build; production discovery also passed. Hosted successful/partial/missing tags, rapid selection cancellation and upstream throttling remain follow-up checks. Safari/Firefox and physical-device checks remain broader release coverage.

The compact preview was checked in the running local app on Next.js Governance at desktop and 672 × 1141 viewports. Its image loaded automatically (2400 × 1256 intrinsic size), the frame measured 262 × 137.109 px with the matching ratio, the title used its natural two lines, and the date/status area occupied 16 px. The image links to the selected page; no separate image action row or branch-focus hint remains.
