# Shitemap release hardening

Implemented source work, October 9, 2026. This is not a deployment or a claim that the public service is fully hardened. Related: [PLAN.md](../PLAN.md), [Kurkelo handoff](KURKELO_HANDOFF.md).

## Sitemap fetching

`components/sitemapNetwork.js` validates every initial, child, and redirect URL. HTTP/HTTPS standard ports only; no credentials, loopback/private/special addresses, or mixed public/private DNS answers. IPv4-mapped IPv6 and alternative numeric IPv4 forms are classified after URL normalization. Both IPv4/IPv6 DNS answers are checked.

Node HTTP(S) connections receive a lookup callback containing only the validated address. The URL hostname remains intact for Host, SNI, and certificate verification. Connections do not reuse an unrelated agent socket, follow implicit redirects, use caller headers/cookies, or inherit a forwarding proxy. Each redirect resolves/checks/pins its own destination; HTTPS downgrade redirects and more than three hops are rejected. No certificate bypass is introduced.

`components/sitemapServer.js` has one queue across all nested indexes. The sitemapper dependency was removed. Limit failures abort the operation and active downloads; ordinary child fetch/parse failures retain usable pages with explicit incomplete-map warnings. Child choices can be offered after an index hits a limit, but every subsequent choice is checked again when fetched. They are not assertions that an unfetched destination is safe.

Limits are in `components/sitemapLimits.js`: 10 MiB per download/intermediate decompression, 20 MiB aggregate wire bytes and 20 MiB aggregate final decoded XML, 50 document URLs, 10,000 unique pages, 15,000 generated nodes, 500 first-level branches, 32 path levels, eight index levels, 64 XML levels, 200,000 XML elements, 2048-character URLs, three concurrent downloads, 15-second document timeout, and 45-second operation timeout.

Content-Length is an early rejection only. Actual stream bytes and gzip/deflate/Brotli expansion are bounded. XML declarations/entities are rejected and structural bounds precede synchronous parsing. Abort/elapsed checks surround CPU work, but parsing is not preemptible; byte/element limits reduce its size rather than guaranteeing a CPU deadline. Browser tree construction repeats graph-budget checks and uses prototype-free path dictionaries.

Development permits exactly the bundled `/sitemap-review.xml` for HTTP localhost/127.0.0.1 inputs, reading the fixed file from disk. It does not grant loopback fetching or arbitrary local file access. Production must use a public XML URL, including the deployed example URL.

## APIs and errors

Both handlers are explicitly Node runtime. Discovery bounds incoming JSON to 4 KiB, reads within five seconds, bounds Kurkelo's compact reply to 256 KiB, bounds returned locations, and refuses service redirects so its bearer key cannot follow them. Kurkelo HTTP 429 is preserved with bounded retry guidance. Collector blocked/partial states remain separate from service errors.

Error JSON contains `error`, stable `code`, generated `requestId`, and optional `candidates`; no partial `sites` accompany a limit failure. Responses include `X-Request-ID`; failures are `no-store`. 413 denotes a resource budget, 422 unusable/blocked sitemap data, 429 throttling, 503 missing/unavailable quotas, and 504 timeout. Unexpected internal messages are replaced with a safe service message. Success caches are still disabled for query-bearing or incomplete results.

The browser handles structured sitemap failures and offers individual child sitemaps from both the landing flow and shared links. Search/hash/page identity behavior is unchanged.

## Production quota setup — required before deploying this change

The source guard uses `@vercel/firewall` with rate-limit ID `shitemap-api`. It shares the client-IP bucket across discovery and sitemap API executions. It trusts the platform-provided IP only when running on Vercel, uses the deployment's `VERCEL_URL` rather than a caller Host header, forwards only the minimal quota headers, and limits the check to one second. No per-process fallback is used.

1. In the correct Vercel project, configure an `@vercel/firewall` rule with ID **shitemap-api**, Fixed Window, **20 requests / 60 seconds**, default client-IP counting, and blocking/429 action. Treat that threshold as a conservative starting point to measure, not a finalized service capacity.
2. Confirm project plan/costs and system environment variables. Publish the rule only under the user's deployment authorization; this source work has not provisioned/published any rule or changed billing.
3. Verify preview automation/deployment protection as documented by Vercel, without weakening production protections. The SDK uses the immutable deployment host; confirm the project's rule applies there as well as the custom domain.
4. Deploy and verify normal discovery/direct XML, repeated calls across both routes, 429/retry guidance, missing-rule behavior, and unavailable-service behavior. Missing rules and failed checks return 503, so deploying first without setup will disable production API calls.
5. Vercel's counters are **per region**, not globally authoritative across regions. Native cached API replies can bypass function execution and its SDK check; this guards backend executions. Add/verify a native path-based edge rule if counting every incoming request is required. Service-wide upstream controls in Kurkelo remain separate.

Official references: [WAF rate limits](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [SDK setup and timeouts](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk), [Node HTTP custom lookup](https://nodejs.org/api/http.html), [Node HTTPS request options](https://nodejs.org/api/https.html).

Development/test mode bypasses the external quota call. Standalone production hosting is deliberately unsupported until a trusted shared limiter adapter is implemented; it returns 503, not an unguarded public endpoint. Redis is an alternative requiring a separate configuration decision; no Redis service has been provisioned.

## Verification and remaining release gates

Meaningful fixtures cover private/mixed DNS, same-host DNS changes on redirect, pinned lookup and certificate settings, unsafe child URLs, malformed XML, XML nesting/elements, compression and aggregate limits, cycles, global scheduling, cancellation, oversized inputs, graph budgets, prototype-like path names, secret-free errors, discovery 429, and fail-closed quota behavior.

`scripts/benchmark-sitemaps.test.js` writes local synthetic measurements to ignored `output/hardening/benchmarks.json`. It covers 100 pages, 10,000 grouped pages, 500 first-level pages, deep paths, and a near-10-MiB document. RSS is sampled after each fixture in one Node process; it is neither isolated peak memory nor browser rendering. Do not use those results as a production capacity guarantee.

Local smoke checks: bundled 104-page fixture and Vite's public 57-page sitemap loaded; loopback and link-local metadata destinations returned `blocked_destination`; the bundled example opened in the browser and blocked entry showed a clear error without console errors.

Remaining: live rule configuration/deployment verification, actual hosting memory/concurrency and browser capacity tests, visible-node expansion budgeting, and Kurkelo's separate hardening. Operational telemetry and Centry remain planned; request IDs alone are not a usage dashboard.
