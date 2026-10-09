# Release verification — October 9, 2026

Last separately verified live release: **0.4.1** at [shitemap.las6.net](https://shitemap.las6.net), with the deployed hardening and quota evidence in [HARDENING.md](HARDENING.md). PNG/SVG export and image clipboard copying are deployed. Concurrent uncommitted appearance/connector work remains separate.

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

Implemented locally, pending release: 50-child expansion batches and faster native export text measurement. Isolated tests/lint/build and local browser checks are recorded in [EXPORT_PERFORMANCE.md](EXPORT_PERFORMANCE.md). Selected-page metadata from Kurkelo follows those improvements. Keep the current single API allowance initially and arrange a dedicated Shitemap credential when Kurkelo provisioning is ready; no additional quota-policy layer is planned.

## 0.4.1 deployment evidence

On October 9, committed snapshot `da2b4ae` (including export `7e273ed` and clipboard `1aca33f`) passed 145 tests, lint and production build independently of uncommitted UI work, then passed the hosted Vercel build. Deployment `dpl_8wdbPwpRL6tWSms4pzqDe959w4DT`: [immutable release](https://shitemap-1q75raeoo-dqcomms.vercel.app). Promoted to [shitemap.las6.net](https://shitemap.las6.net).

Hosted smoke checks: version 0.4.1 visible; protected fetching loaded the deployed 104-page example; PNG downloaded at 3,890 × 1,652; SVG downloaded at 1,945 × 826 with embedded fonts; Copy image reported the expected PNG dimensions. Kurkelo discovery returned Vite's sitemap and link-local metadata targets returned HTTP 422 `blocked_destination`. The existing shared quota remains active. No billing, plan, credential, or quota-policy changes were made for this release.

## 0.4.2 Git-triggered release

Source 0.4.2 includes 50-child expansion, faster native export text measurement, seamless reflected circuitry assets, and consistent isometric defaults with a development-only scale control. The complete working tree passed 148 tests, lint, and a production Turbopack build. Main pushes use the existing Vercel Git integration; no separate CLI deployment is required. Hosted 0.4.2 smoke verification remains pending. See [EXPORT_PERFORMANCE.md](EXPORT_PERFORMANCE.md) for export evidence and future Pretext consideration.
