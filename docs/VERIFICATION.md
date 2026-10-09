# Release verification — October 9, 2026

Live: **0.3.1** at [shitemap.las6.net](https://shitemap.las6.net), with the deployed hardening and quota evidence in [HARDENING.md](HARDENING.md). Source: **0.4.0**, adding PNG/SVG export; not yet deployed. Concurrent uncommitted appearance/connector work remains separate.

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
| PNG transparency | Downloaded RGBA PNG has transparent corner alpha 0 |
| SVG independence | Native paths/rectangles/text; XML parses; fonts embedded; no external asset URLs or foreignObject; standalone browser visual review passed |
| Committed source | 141 tests, lint, and production build pass in an isolated Git snapshot; the working tree including concurrent changes passed 142 tests |

Temporary development fixture routes were removed before the final build. Local review artifacts are in ignored `output/release-review/`; they are not public runtime endpoints. Browser capacity results are functional observations in the Codex preview, not frame-rate, peak-memory, cross-browser, or hosting-throughput guarantees. Capacity fixtures used the working tree, including its uncommitted connector optimizations; the committed snapshot was independently tested/built.

## Export behavior

Use **Export map** in the toolbar. Choose PNG or SVG and current-theme solid background or transparency. Downloads include the current expanded pages and collection nodes, including off-screen content, with current geometry, typography/detail, view and direction. They omit chrome, inspector, selection/hover highlights, branch action buttons, decorative textures, branding, and remote metadata images. Export does not expand hidden branches or fetch publisher content.

PNG starts at 2× resolution, reduces the whole image when necessary, and caps each side at 8,192 pixels and total area at 16 megapixels. Very broad/tall maps can become unreadable at that size; SVG retains full vector dimensions. Both formats bound work to 2,000 displayed nodes and 300,000 text characters and offer collapse guidance beyond those limits. SVG embeds the app's local fonts; editors that ignore embedded web fonts may require those fonts installed. Native text remains editable.

## Remaining verification

- Safari/Firefox and physical iOS/Android devices; vector-editor font compatibility.
- Hosted 0.4.0 deployment and actual-download smoke checks after review.
- Hosting memory/concurrency measurements and extreme interactive expansion; no service-wide capacity guarantee is asserted.
- Full browser partial-index/retry cases remain broader coverage work; server/API tests already cover bounded traversal, partial warnings, candidates, and errors.

Next user-facing feature: selected-page metadata from Kurkelo. Keep the current single API allowance initially and arrange a dedicated Shitemap credential when Kurkelo provisioning is ready; no additional quota-policy layer is planned.
