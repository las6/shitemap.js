# Shitemap Product Vision & Ideas

## Target Audience & Use Case
A tool for the early stages of website refreshes or audits. It visually explores existing site structure to quickly understand the current architecture.

## MVP Requirements
1. **Hosted Platform:** Needs to be accessible online (e.g., hosted on Vercel/Cloudflare). Must include a working backend/API to handle the actual sitemap parsing.
2. **Improved Visualization:** The current DAG auto-layout is insufficient for flat hierarchies. Needs a more visually interesting and readable layout algorithm or design approach.
3. **Interactivity:** Nodes in the visual graph must be collapsible/toggleable to manage large sitemaps.

## Future / "Nice to Have" Features
- **Editing & Sharing:** The ability to move nodes, rename them, or modify the visualization, and then share the resulting map via a unique URL (requires persistent storage/backend).
- **Benchmark/Inspiration:** octopus.do, but the goal is to be simpler and more heavily focused on visual impact.

---

## Layout Algorithm Research (April 2026)

### The Problem
Dagre uses the Sugiyama layered algorithm: nodes are assigned to horizontal "ranks" by depth, then positioned within each rank. On a typical corporate site with 200 pages all at `/blog/post-name` (depth 2), dagre puts every post on the same rank — producing a 200-node column that is completely unreadable at any useful zoom level.

The fundamental constraint: **do nodes at the same depth have to be on the same visual row?** For dagre: yes. The answer from algorithm research: **no** — most alternatives break this constraint in different and useful ways.

---

### Algorithm Options

#### 1. Dagre (current) — `dagrejs/dagre`
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
