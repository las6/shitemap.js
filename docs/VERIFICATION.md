# Release verification — October 9, 2026

Last verified hosted version: **0.4.2** at [shitemap.las6.net](https://shitemap.las6.net), with the deployed hardening and quota evidence in [HARDENING.md](HARDENING.md). PNG/SVG export and image clipboard copying are deployed. Appearance and expansion/export improvements are committed and pushed on main. The full hosted export smoke review below remains the 0.4.1 evidence.

## Completed checks

| Check | Evidence / scope |
| --- | --- |
| Hosted discovery and XML | Kurkelo discovery opens Vite's 57-page map; direct XML works |
| Shared-link reload | Bare + vertical parameters and selected Team hash survive hosted reload |
| Search/reveal | Hosted search reveals a collapsed descendant and opens its details |
| Production diagnostics | Appearance panel excludes Fuchsia test; no browser error logs during hosted review |
| Cancellation | Local 10-second simulated connection latency; Cancel restores the input without navigation; network overrides removed |
| Responsive controls | 390 × 844 emulated viewport; export panel fits, toolbar and identity no longer overlap; device overrides removed |
| 10,000-page inventory | Development browser fixture opens with 201 displayed nodes; search reveals page 9,999, producing 300 displayed nodes |
| 500 first-level branches | Development browser fixture renders 501 nodes; PNG exports at 97 × 8,192 with explicit scaling notice; no console errors |
| Export variants | Regular/Bare, horizontal/vertical, light/dark, collapsed collections, selected-page chrome exclusion, Unicode and long wrapped labels checked through actual downloads |
| Image clipboard | Actual browser clipboard read verifies PNG dimensions; copy works with SVG selected and transparency enabled. Unsupported/denied access and render failures have download/error guidance tests |
| PNG transparency | Downloaded RGBA PNG has transparent corner alpha 0 |
| SVG independence | Native paths/rectangles/text; XML parses; fonts embedded; no external asset URLs or foreignObject; standalone browser visual review passed |
| Committed source | 145 tests, lint, and production build pass in an isolated Git snapshot; the working tree including concurrent changes passed 146 tests |

Temporary development fixture routes were removed before the final build. Local review artifacts are in ignored `output/release-review/`; they are not public runtime endpoints. Browser capacity results are functional observations in the Codex preview, not frame-rate, peak-memory, cross-browser, or hosting-throughput guarantees. Capacity fixtures used the working tree, including its uncommitted connector optimizations; the committed snapshot was independently tested/built.

## Export behavior

Use **Export map** in the toolbar. **Copy image** writes PNG directly to the clipboard using the chosen background, independently of the download format; no download or publisher fetch is triggered. The write starts during the click gesture with promise-backed image data. Unsupported or denied clipboard access shows download guidance. Choose PNG or SVG and current-theme solid background or transparency. Downloads include the current expanded pages and collection nodes, including off-screen content, with current geometry, typography/detail, view and direction. They omit chrome, inspector, selection/hover highlights, branch action buttons, decorative textures, branding, and remote metadata images. Export does not expand hidden branches or fetch publisher content.

PNG starts at 2× resolution, reduces the whole image when necessary, and caps each side at 8,192 pixels and total area at 16 megapixels. Very broad/tall maps can become unreadable at that size; SVG retains full vector dimensions. Both formats bound work to 2,000 displayed nodes and 300,000 text characters and offer collapse guidance beyond those limits. SVG embeds the app's local fonts; editors that ignore embedded web fonts may require those fonts installed. Native text remains editable.

## Remaining verification

- Safari/Firefox and physical iOS/Android devices; vector-editor font compatibility.
- Hosting memory/concurrency measurements and extreme interactive expansion; no service-wide capacity guarantee is asserted.
- Full browser partial-index/retry cases remain broader coverage work; server/API tests already cover bounded traversal, partial warnings, candidates, and errors.

Released in 0.4.2: 50-child expansion batches and faster native export text measurement. Isolated tests/lint/build and local browser checks are recorded in [EXPORT_PERFORMANCE.md](EXPORT_PERFORMANCE.md). Selected-page metadata from Kurkelo is included in source release 0.4.3; see [METADATA.md](METADATA.md) for verification and remaining live checks. Keep the current single API allowance initially and arrange a dedicated Shitemap credential when Kurkelo provisioning is ready; no additional quota-policy layer is planned.

## 0.4.1 deployment evidence

On October 9, committed snapshot `da2b4ae` (including export `7e273ed` and clipboard `1aca33f`) passed 145 tests, lint and production build independently of uncommitted UI work, then passed the hosted Vercel build. Deployment `dpl_8wdbPwpRL6tWSms4pzqDe959w4DT`: [immutable release](https://shitemap-1q75raeoo-dqcomms.vercel.app). Promoted to [shitemap.las6.net](https://shitemap.las6.net).

Hosted smoke checks: version 0.4.1 visible; protected fetching loaded the deployed 104-page example; PNG downloaded at 3,890 × 1,652; SVG downloaded at 1,945 × 826 with embedded fonts; Copy image reported the expected PNG dimensions. Kurkelo discovery returned Vite's sitemap and link-local metadata targets returned HTTP 422 `blocked_destination`. The existing shared quota remains active. No billing, plan, credential, or quota-policy changes were made for this release.

## 0.4.2 Git-triggered release

Source 0.4.2 includes 50-child expansion, faster native export text measurement, seamless reflected circuitry assets, and consistent isometric defaults with a development-only scale control. The complete working tree passed 148 tests, lint, and a production Turbopack build. Main pushes use the existing Vercel Git integration; no separate CLI deployment is required. Remote main was verified at `65518fa04e89edd0343a2b51b9124cd33d2c4d86`; the public homepage returned version 0.4.2 after the Git-triggered deployment. No separate CLI deployment was performed. Full hosted export checks were not repeated. See [EXPORT_PERFORMANCE.md](EXPORT_PERFORMANCE.md) for export evidence and future Pretext consideration.

## Selected-page metadata — release 0.4.3

The metadata proxy, bounded map-local request reuse and details preview pass 171 tests, lint and production Turbopack build. Browser checks cover successful controlled HTML through Kurkelo’s real parser/handler, inferred folders, repeat-page cache reuse and broken-image fallback. The initial image check used opt-in loading; current source automatically hotlinks images. Temporary fixture routes were removed before build. Real Vite and Next.js metadata now pass through the local Shitemap proxy against deployed Kurkelo after correcting local service configuration. An isolated browser preview confirms Vite’s actual title, description and image. Hosted Shitemap proxy verification remains pending as described in [METADATA.md](METADATA.md).

## October 12 release submission

Version 0.4.3 contains the metadata proxy and request reuse, compact image-first inspector with automatic browser hotlinking, preview links opening the page, removal of the branch-focus hint, and the explicit loopback development origin. The readiness review passed 171 tests, lint and production build and confirmed existing production discovery. The user then requested the version bump, logical commits and main push while skipping further testing. No release-time test/build rerun or hosted smoke check is performed; Vercel builds through the existing Git integration. Deployment completion and hosted metadata behavior are not asserted here.
