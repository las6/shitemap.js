# Shitemap.js

Visual sitemap explorer by [las6](https://las6.net). Enter a domain, website URL, or sitemap XML URL to get an interactive graph. Website entries use Kurkelo to find sitemap locations; multiple locations offer a choice. Sitemaps are checked for usable page URLs before opening the graph.

## Status and next steps

As of October 9, 2026, the public app is version 0.4.1, including PNG/SVG export and image clipboard copying. Domain discovery, bounded sitemap loading, Regular/Bare exploration, search, page details, presentation, and shareable view settings are implemented. Sitemap fetching now pins connections to validated public addresses and enforces operation-wide budgets. Both APIs have a fail-closed Vercel quota guard; the rule is published and shared throttling, discovery, public XML, and blocked destinations were verified on the deployed release. Functional browser capacity/shared-link checks are recorded in [VERIFICATION.md](docs/VERIFICATION.md); cross-browser/device and hosting load checks remain. See [hardening and deployment](docs/HARDENING.md).

See [PLAN.md](PLAN.md) for implementation status, release gates, and the sequence: hardening and basic operational measurement → deployed verification → PNG/SVG export → selected-page metadata. [Kurkelo API handoff](docs/KURKELO_HANDOFF.md) records the separate service requirements. [Usage and operations](docs/OPERATIONS.md) proposes request/usage measurement across Shitemap, Kurkelo, and ADvisor, with Centry for errors. These plans are not implemented integrations.

## Setup

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Website discovery calls Kurkelo from the server. Run the Kurkelo project at `http://localhost:8787` during development, or set `KURKELO_URL` in `.env.local` to its accessible origin. Production requires `KURKELO_URL`; set `KURKELO_API_KEY` when the service requires a bearer key. Both settings stay on the server. Direct sitemap XML URLs and the bundled example also work without Kurkelo.

XML syntax and sitemap roots are checked, without requiring full schema validation. Empty sitemaps or results with no usable page URLs show an error. Invalid page locations are skipped; failed child sitemap files preserve usable pages with a visible “Map may be incomplete” notice. Shared sitemap links offer retry and return-to-start actions when loading fails.

The public examples cover Vite’s small documentation site, Next.js’s nested documentation and learning paths, and Linear’s larger product site and changelog. Each uses domain discovery and then loads the current sitemap.

Discovery and sitemap loading use a fullscreen bitmap-font status view, with cancellation while fetching. It stays visible through navigation into the graph; errors and multiple-sitemap choices return to the landing form.

## Stack

- Next.js 16 (App Router)
- @xyflow/react (React Flow v12)
- Deterministic tree layout in `components/explorer.js` (ELK.js remains installed for legacy layout code)
- Protected Node HTTP(S) fetching and a bounded sitemap-index queue

## Exploring a map

- The Shitemap logo before the current site’s name returns to the domain/URL input, with a “New sitemap” tooltip and accessible label. The wordmark also links home; navigation is hidden during presentation.
- Switching view or direction automatically fits and centers the new presentation, preserving selection and collapsed branches.
- Large maps open at a readable Home/branch framing; Fit intentionally shows the entire map, and panning reaches all sections.
- All first-level pages and inferred paths remain visible when Home is expanded. Named siblings sort naturally alphabetically, followed by date archive paths newest first; deeper branches still use collections.
- Regular is the default theme; Bare strips pages down to labels and straight branch lines. Direction is independent: left-to-right by default, with top-down available in either theme.
- Compact dark Home nodes retain bitmap type. Page titles use Recursive, wrapping without truncation. Regular parents have inline expand/count controls; Bare parents toggle from their labels. Select leaf pages for ancestry, URLs, and inspection actions.
- Collections use three outlines with counts of additional pages. Large branches reveal 12 children at a time; search reveals matching pages and their ancestors.
- View, direction and detail are shareable URL parameters (`view=bare`, `direction=vertical`, `detail=inspection`); defaults are omitted. Changes replace the current history entry and preserve the selected-page hash.
- Detail defaults to Auto: overview retains titles and counts, while close inspection reveals paths. Overview and Inspection can also be selected explicitly. Labels and borders compensate for overview zoom.
- Double-click or double-tap to focus a page: gentle zoom toward 100%, with a capped offset toward up to three nearest visible children or collection stacks. Existing close zoom and collapsed branches are preserved. The details panel offers a clear external page link and a branch toggle.
- Collapse keeps the parent position and camera stable. Later siblings reflow into the space freed by the branch. Fit and search navigation are explicit camera operations.
- Search opens from its icon or Cmd/Ctrl+K; arrow keys and Enter navigate results. Map settings hold view, direction and detail; Appearance holds theme and background controls. Zoom stays in the lower-right corner.
- Presentation hides all chrome, including the wordmark. Escape exits; the lower-right exit button also appears on hover or keyboard focus.
- Text uses Recursive; bitmap wordmarks and anchor lettering use Doto. Inter is no longer loaded.
- Appearance settings store texture, visibility, reflection contrast, and isometric choices, with optional map backgrounds. Fuchsia diagnostics and their rendering effect are development-only, including when a saved debug preference exists. Production appearance verification remains part of the release checks.

Background choices are shared between the landing page and map and saved locally. Appearance offers grain and circuitry, visibility and reflection contrast, and isometric circuitry. Map backgrounds are opt-in. Fuchsia pattern inspection is available in development. Reflections follow the pointer with broad lighting fields and respect reduced motion.

## Changing the visual design

- `app/ExplorerTheme.css`: semantic colors, fonts, and corner tokens, with light/dark palettes. Start here for a new style; no graph logic is required.
- `app/Explorer.css`: canvas chrome, shared node surfaces, and the Bare overrides.
- `components/explorerStyle.js`: the shared geometry contract (title rows, widths, spacing, collection batch size, zoom threshold). Update geometry here when a style needs different proportions.
- `components/explorer.js`: tree indexing and deterministic layout; it accepts independent `mode` and `direction` options. Synthetic collections never alter the source sitemap.
- `app/SitemapNodes.js`: reusable page/collection renderers and orthogonal connectors. Page and stack handles use the same first-row anchor, including during inspection.
- `app/useViewSettings.js` and `components/viewSettings.js`: URL persistence and validation.
- `components/Wordmark.js`: shared S(h)itemap.js lettering.
- The small version beside both wordmarks reads from `package.json`; bump its version for each release.
- `components/pageFocus.js`: adjustable branch-focus zoom and camera limits.
- `app/PageDetails.js` and `.css`: selected-page details and actions.
- `app/CanvasControls.js` and `.css`: canvas tools, search keyboard behavior and settings; independent of graph rendering.
- `app/Landing.css`: landing composition using the shared theme tokens.
- `components/Icon.js`: vendored Lucide icon subset (license in `public/licenses/lucide.txt`). `public/favicon.svg` adapts Network with heavier strokes on a coral squircle; ICO and Apple PNG are fallbacks.
- `app/Flow.js`: selection, search, collapse state and viewport behavior.

For a local review fixture, enter `http://localhost:3000/sitemap-review.xml` on the start page. It contains the same 104-page Nordhouse example used during design review.

Run `pnpm test`, `pnpm lint`, and `pnpm build` after changes. The build downloads Google fonts through Next.js and needs network access.

Run the synthetic capacity fixtures separately with `pnpm exec vitest run scripts/benchmark-sitemaps.test.js`; measurements are written to ignored `output/hardening/benchmarks.json`. They measure Node parsing/tree/layout, not browser rendering. Production API calls require a configured Vercel Firewall rule; development bypasses the external quota service and can read only the bundled local fixture, not arbitrary private URLs.

## Exporting a map

Open **Export map** in the map toolbar, choose PNG or SVG, and select a solid current-theme background or transparency. Export includes the current expanded map beyond the viewport; it omits controls, inspector, highlights, and decorative backgrounds. PNG scales the whole map to at most 8,192 pixels per side and 16 megapixels. Choose SVG for large maps; its native vector text and geometry include embedded fonts. Exports support up to 2,000 displayed nodes; collapse branches if prompted.

For a quick paste, use **Copy image** in the same panel. It copies PNG using the chosen background, even when SVG is selected for download. If clipboard access is unavailable or blocked, the panel gives download guidance.
