# Shitemap.js

Visual sitemap explorer by [las6](https://las6.net). Enter a domain, website URL, or sitemap XML URL to get an interactive graph. Website entries use Kurkelo to find sitemap locations; multiple locations offer a choice. Sitemaps are checked for usable page URLs before opening the graph.

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
- ELK.js for graph layout
- Sitemapper for sitemap fetching

## Exploring a map

- The Shitemap logo before the current site’s name returns to the domain/URL input, with a “New sitemap” tooltip and accessible label. The wordmark also links home; navigation is hidden during presentation.
- Switching view or direction automatically fits and centers the new presentation, preserving selection and collapsed branches.
- Large maps open at a readable Home/branch framing; Fit intentionally shows the entire map, and panning reaches all sections.
- All first-level pages and inferred paths remain visible when Home is expanded. Named siblings sort naturally alphabetically, followed by date archive paths newest first; deeper branches still use collections.
- Regular is the default theme; Bare strips pages down to labels and straight branch lines. Direction is independent: left-to-right by default, with top-down available in either theme.
- Compact dark Home nodes retain bitmap type. Page titles use Recursive, wrapping without truncation. Regular parents have inline expand/count controls; Bare parents toggle from their labels. Select leaf pages for ancestry, URLs, and inspection actions.
- Collections use three outlines with explicit hidden/other page counts. Large branches reveal 12 children at a time; search reveals matching pages and their ancestors.
- View, direction and detail are shareable URL parameters (`view=bare`, `direction=vertical`, `detail=inspection`); defaults are omitted. Changes replace the current history entry and preserve the selected-page hash.
- Detail defaults to Auto: overview retains titles and counts, while close inspection reveals paths. Overview and Inspection can also be selected explicitly. Labels and borders compensate for overview zoom.
- Double-click or double-tap to focus a page: gentle zoom toward 100%, with a capped offset toward up to three nearest visible children or collection stacks. Existing close zoom and collapsed branches are preserved. The details panel offers a clear external page link and a branch toggle.
- Collapse keeps the parent position and camera stable. Later siblings reflow into the space freed by the branch. Fit and search navigation are explicit camera operations.
- Search opens from its icon or Cmd/Ctrl+K; arrow keys and Enter navigate results. View, direction and detail live in the settings popover. Zoom stays in the lower-right corner.
- Presentation hides all chrome, including the wordmark. Escape exits; the lower-right exit button also appears on hover or keyboard focus.

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
