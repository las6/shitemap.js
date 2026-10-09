# Shitemap Product Vision & Ideas

## Target Audience & Use Case
A tool for the early stages of website refreshes or audits. It visually explores existing site structure to quickly understand the current architecture.

## MVP Requirements
1. **Hosted Platform:** Server APIs for discovery and XML parsing are implemented. Protected fetching, resource budgets, and public API quotas are deployed and smoke-tested. Broader browser/hosting capacity review remains; see PLAN.md for current evidence.
2. **Improved Visualization:** Implemented with deterministic Regular/Bare tree views, collections, direction controls, and zoom-aware detail.
3. **Interactivity:** Implemented collapse/expand, search, branch focus, page details, and presentation.

## Current priorities — October 9, 2026

[PLAN.md](PLAN.md) is the current delivery plan. Fetching protection and public API quotas are delivered. Focused browser verification, PNG/SVG export, and image clipboard copying are deployed in 0.4.1; cross-browser/device and hosting load checks remain. Selected-page metadata from Kurkelo follows, with basic operational measurement added incrementally. Whole-site unfurling is deferred. Centry is the proposed error-tracking integration; app usage and service request accounting are separate concerns. See [usage and operations](docs/OPERATIONS.md) and the [Kurkelo handoff](docs/KURKELO_HANDOFF.md).

## Future / "Nice to Have" Features
- **Editing & Sharing:** The ability to move nodes, rename them, or modify the visualization, and then share the resulting map via a unique URL (requires persistent storage/backend).
- **Benchmark/Inspiration:** octopus.do, but the goal is to be simpler and more heavily focused on visual impact.
- **Metrics-driven spatial view (follow up later):** Reuse the Search Console / analytics integration ideas to add page-level traffic or search-performance data. Spatial size or height should encode an explicitly labeled metric and time period, giving isometric or volume maps a purpose beyond decoration. Keep this separate from the structural sitemap views; no integration work is planned yet.

## Interaction and identity ideas — October 9, 2026

Recorded for exploration; these are not approved behavior changes or new release gates.

- **Keyboard navigation and toggling:** Navigate between sitemap pages and expand/collapse branches from the keyboard. Let the view follow only when the focused page approaches the screen edge, using an inset safe zone rather than recentering after every keypress. Account for toolbars and an open inspector. Consider logical tree navigation versus spatial arrow navigation in both directions, roving focus, visible focus, screen-reader semantics/announcements, and reduced motion. Preserve text input, ordinary Tab navigation, and existing page-button activation; avoid conflicting with React Flow's accessibility behavior.
- **Expand the whole collection:** Consider revealing all collapsed pages represented by a collection instead of just the next set. Clarify whether this means all immediate children or recursive descendants. Pros: fewer clicks, a complete branch at once, and easier overview/export preparation. Cons: potentially large layout jumps, loss of context, slower rendering, and exceeding visible/export budgets. Compare making this the default with keeping gradual expansion and offering a separate explicit “Expand all” action; preserve an easy collapse/undo path. No choice is settled.
- **Faster image copying:** Clipboard images look good, but copying can feel slow. Measure font/geometry readiness, text-line measurement, canvas rendering/encoding, and clipboard-write time separately before choosing an optimization. Explore reusing a prepared PNG for an unchanged map, avoiding repeated measurement, and offering a lower-resolution quick copy if useful. Cached results must invalidate when expanded content, geometry, detail/readability, fonts, theme, or background changes; avoid large retained image buffers. Keep feedback clear and the existing image quality available.
- **Copy shortcut:** Consider Ctrl/Cmd+C for copying the map image when the canvas has focus. Preserve normal copy when text is selected or an input, inspector, or other editable area is active. Check discoverability, keyboard/screen-reader expectations, and the clipboard's user-gesture requirement. An explicit copy button remains available; shortcut scope is not decided.
- **More distinctive favicon:** The current favicon is acceptable but generic. Explore a stylized **S** with nodes at its start and end, connecting the initial to the sitemap idea. Assess recognizable shape at 16/32 px, light/dark backgrounds, simple strokes and node dots, and consistency with the wordmark before replacing the existing icon.

## Visual exploration decisions (October 2026)

- **Approved baseline:** Regular + Bare exploration accepted on October 8, 2026. Review artifact: `/Users/lauri/.codex/visualizations/2026/10/08/01a11a47-55a3-7152-8b2e-ce4a5e03d3fe/shitemap-regular-and-bare.html`. This is the approved reference. The app now implements Regular and Bare with shared theme tokens, geometry settings, independent direction and detail controls, and stable collapse behavior.
- Regular is the primary view: compact rounded cards, Recursive page titles, a dark Home node with larger white bitmap type, inline expand/count controls, and three-layer collection stacks. No redundant root badge or vertically stacked controls.
- Preserve overview/inspection differences: overview prioritizes titles and structure; inspection adds paths and larger text. Keep presentation controls hideable for client screenshots.
- Bare uses a stable first text row shared by ordinary pages and collection stacks. Snap nearly aligned parent/first-child anchors without changing hierarchy. Collapse must not shift Home or the toggled parent; subsequent siblings may reflow as a branch contracts. This was verified with zero-pixel Home/parent movement at overview and inspection scales.
- Treat layout modes and visual identity as separate decisions. Tree and Route can share a theme; Bare is an optional simplified view, not the default.
- Direction is independent of theme and toggleable in every view. Prefer left-to-right by default. Bare uses visible text bounds for connectors and node geometry, with straight spines that stop at the last child; avoid inheriting invisible card dimensions or adding short stepped bends.
- Bare should use readable labels and precise branching lines, without persistent chevrons, child counts, card surfaces, or left-border selection/hover highlights. Keep interaction minimal and keyboard accessible.
- Recursive is an acceptable working typeface, not a final brand decision. Soft blocks remains a possible secondary theme; Printer’s proof is discarded.
- Larger bitmap type can still work as white text on dark root/anchor nodes in the more visual views. Avoid bitmap page titles at small sizes or in grey on white.
- Keep visual nodes compact: omit redundant labels such as “Site root”; place any expand control and count side by side rather than stacking them vertically.
- Preserve compact three-layer collection stacks and explicit hidden-page counts. Connectors must terminate at actual visible children, including after collapse or collection expansion; no spine should extend past the final child.

---

## Layout Algorithm Research (April 2026)

Historical exploration below, not the current architecture or delivery plan. References to “current” layouts and implementation recommendations describe the April research context. The active October implementation uses `components/explorer.js`; the old layout helpers are not the active view.

### The Problem
Dagre uses the Sugiyama layered algorithm: nodes are assigned to horizontal "ranks" by depth, then positioned within each rank. On a typical corporate site with 200 pages all at `/blog/post-name` (depth 2), dagre puts every post on the same rank — producing a 200-node column that is completely unreadable at any useful zoom level.

The fundamental constraint: **do nodes at the same depth have to be on the same visual row?** For dagre: yes. The answer from algorithm research: **no** — most alternatives break this constraint in different and useful ways.

---

### Algorithm Options

#### 1. Dagre (April baseline) — `dagrejs/dagre`
**How it works:** Sugiyama layered layout. Each node gets a rank = path depth. Nodes in the same rank are distributed along the perpendicular axis with crossing minimization.

**Why it fails for sitemaps:**
- A flat site (e.g. e-commerce with 500 products under `/shop/`) creates a single rank of 500 nodes.
- "Rank overflow" = that rank is unusably wide or tall at any zoom.
- There is no wrapping or reflow built in.

**Dagre-native mitigation (limited):** Increase `nodesep`/`ranksep` and enable the user to zoom very far out (current `minZoom=0.01` already does this). This doesn't solve readability.

**Verdict:** Keep as one option, but is insufficient as the only layout.

---

#### 2. ELK Layered with Graph Wrapping — `elkjs`
**How it works:** ELK Layered is a Sugiyama implementation like dagre, but with far more options. The key feature is **Graph Wrapping** (`org.eclipse.elk.layered.wrapping.strategy`), which can fold a long single-rank into multiple rows — like CSS `flex-wrap` for graph layers.

**Wrapping modes:**
- `SINGLE_EDGE`: cuts the rank at one point, wraps into a new row
- `MULTI_EDGE`: cuts at multiple points, distributes into a grid-like structure

**Why this is interesting for sitemaps:**
- Preserves the familiar top-down hierarchy visual convention
- Automatically reflows a 200-node rank into ~5 rows of 40, fitting the viewport
- Can set `aspectRatio` to target a 16:9 or square layout
- Edges are routed (orthogonal or spline), so cross-wrap parent→child edges still render clearly
- Supports **async layout** (runs off-thread in a web worker) — important for large sitemaps

**Downsides:**
- `elkjs` bundle is ~1.4MB (vs dagre ~40KB). Should run in a web worker to avoid blocking.
- More complex API than dagre
- ReactFlow has a good elkjs example: https://reactflow.dev/examples/layout/elkjs

**Verdict: Best fit for the "standard tree" use case.** Wrapping solves rank overflow without abandoning the hierarchy metaphor. Recommended primary layout for sites with clear depth structure.

---

#### 3. ELK Radial — `elkjs` (org.eclipse.elk.radial)
**How it works:** Places the root node at the center, child nodes radially around it, grandchildren radially around their parents. Each ring = one depth level.

**Why this is interesting for sitemaps:**
- Naturally handles flat sites: a site with 200 pages at depth 1 places them around the root in a circle — readable, and the visual density communicates "this is a flat site"
- Depth 1 = inner ring, depth 2 = outer ring: site structure immediately visible
- Available inside elkjs (same library as option 2, no extra dep)

**Downsides:**
- Radial edge routing can be cluttered when nodes have children across rings
- Less familiar convention than top-down tree for most users
- Works poorly when one section is huge (half the circle) and others are tiny

**Verdict: Best fit for very flat sites.** Could auto-activate when flatness is detected (see heuristic below).

---

#### 4. D3-Force — `d3-force`
**How it works:** Physics simulation. Link force pulls connected nodes together; charge (repulsion) pushes all nodes apart; center force pulls toward origin. Runs iteratively until equilibrium.

**Why it's considered:**
- Doesn't enforce any rank/depth constraint — nodes find their own equilibrium
- Naturally handles irregular structure (some deep branches, some flat)
- Visually dynamic and organic — appeals to creative/design audiences

**Why it's problematic for sitemaps specifically:**
- **Non-deterministic**: same sitemap renders differently each time (can add a fixed seed, but layout still shifts on node count changes)
- **No inherent hierarchy signal**: the root node doesn't visually dominate; parent-child direction is implied only by edge direction, which is hard to read on a crowded canvas
- **Performance**: iterative simulation must run on every render or be frozen; freezing loses the benefit of "finding equilibrium" on pan/zoom
- **Edge crossing**: force layouts have many more crossed edges than layered layouts; sitemap parent→child relationships become hard to trace
- ReactFlow's force layout example requires a custom `useLayoutedElements` hook with `requestAnimationFrame` ticking

**Verdict: Not recommended as primary layout.** May be worth offering as an "explore mode" toggle for users who want to browse loosely, but not as the default.

---

#### 5. D3-Hierarchy Cluster/Tree — `d3-hierarchy`
**How it works:** `d3.tree()` and `d3.cluster()` compute a clean, fixed tree layout. All nodes get equal spacing; `cluster()` aligns all leaves at the same depth.

**Why it's limited:**
- Assumes fixed node size — all nodes same width/height (fine for shitemap's uniform pill nodes)
- `d3.tree()` in radial mode (set `size([2 * Math.PI, radius])`) produces a **radial dendrogram** — a beautiful circular tree where hierarchy is very clear
- **Radial tree differs from radial force**: this is deterministic, respects hierarchy, and is very clean

**Verdict: D3 radial tree is a strong secondary option**, but is purely a layout algorithm (no edge routing). Would need manual ReactFlow position assignment. ELK Radial covers the same use case with better edge routing built in.

---

### Flatness Heuristic

Before deciding which layout to use, measure the sitemap's structure:

```js
function measureFlatness(nodes) {
  const depths = nodes.map(n => n.data.depth);
  const maxDepth = Math.max(...depths);
  const nodesAtDepth1 = depths.filter(d => d === 1).length;
  const flatRatio = nodesAtDepth1 / nodes.length;
  return { maxDepth, flatRatio };
}
```

Suggested switching logic:
- `maxDepth <= 2` OR `flatRatio > 0.5` → use **ELK Radial** (or ELK Layered wrapped with tight `aspectRatio`)
- Otherwise → use **ELK Layered with wrapping**
- Always offer a manual toggle in the UI

---

### Grouping as a Convention

An alternative or complement to algorithm switching: **virtual grouping**. Many sites that appear "flat" have implicit section groupings in their URL patterns (e.g. `/blog/`, `/products/`, `/support/`). Shitemap already builds a path tree — it could:

1. Detect the top-level path segments as "section groups"
2. Represent each section as a **ReactFlow group node** (parent container)
3. Run ELK Layered on the top-level (sections), then a separate compact layout inside each group

This is the approach used by tools like **octopus.do** — the visual result is a clean grid of section tiles, each containing its pages. It's more work but produces the most legible result for large flat sites.

Implementation: ReactFlow sub-flows + ELK's compound graph support. Requires refactoring the node/edge builder in `components/helpers.js`.

---

### Recommendation Summary

| Approach | Best for | Effort | Priority |
|---|---|---|---|
| **ELK Layered + wrapping** | Deep/mixed sites | Medium | P1 |
| **ELK Radial** | Flat sites | Medium (same lib) | P1 |
| **Auto-switch by flatness** | General case | Low (heuristic only) | P1 |
| **Virtual section grouping** | Large flat sites (>100 nodes) | High | P2 |
| D3-Force | Not recommended | — | — |

**Recommended implementation path:**
1. Replace dagre with elkjs. Implement ELK Layered with wrapping as default.
2. Implement ELK Radial as a second layout option.
3. Add auto-detection: flatness heuristic switches between the two on load, with a manual toggle in the UI.
4. (Later) Add section grouping as a power feature for very large sitemaps.
