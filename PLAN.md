# The plan

## Status legend: [x] done, [-] partial/needs revisit, [ ] not started

---

## / — Intro / home view
- [x] URL input form
- [x] Preset sitemap buttons (Cricket Lighters, Jalostaja, Airam)
- [ ] Upload local sitemap.xml (future)

---

## /view/[url] — Graph view

### Data layer
- [x] Fetch sitemap via `/api/sitemapper` (sitemapper npm package — handles sitemap index files recursively)
- [x] Build URL tree (`makeTree`) with depth annotation on each node, short labels (last path segment only)
- [x] Flatten tree to ReactFlow nodes + edges (`getSubSitemap`, `getSubEdgemap`)

### Layout engines (algorithm switcher in UI)

#### `⊞ Groups` (default) — compound node layout
- [x] Section nodes become ReactFlow compound container nodes (`type: 'sectionGroup'`)
- [x] Descendants placed inside with `parentNode` + local grid coordinates — no section→leaf edges
- [x] Only root→section edges drawn
- [x] Grid: column-first, max 6 cols, √N sizing
- [-] **Visual result: mixed.** The containment concept is right but the overall look hasn't been validated against all three test sites yet. Needs fresh-eyes review.

#### `⊟ Flat` — section-grid layout (legacy)
- [x] Section headers in a row, descendant cards in a wrapped grid below each
- [x] Edges from section→leaf create messy smoothstep fans for horizontally-spread children
- [-] **Visual result: broken for large flat sections.** Kept for comparison.

#### `→ Layered` / `↓ Layered` — ELK layered
- [x] ELK Layered LR / TB with MULTI_EDGE wrapping
- [-] **Visual result: broken.** Scattered nodes, phantom rectangles. Root cause not fully debugged.

#### `◎ Radial` — ELK radial
- [x] ELK Radial layout
- [-] **Visual result: untested recently.** Was the auto-detect target for flat sites.

### Variable node sizing by depth
- [x] depth 0 (root): 200×48
- [x] depth 1 (section): 172×40 (or sectionGroup compound node)
- [x] depth 2+ (leaf): 150×32

### Visual design
- [x] Depth-based CSS classes: `.node-root`, `.node-section`, `.node-leaf`, `.node-section-group`
- [x] CSS variable theming (light + dark mode)
- [x] Dot grid background
- [x] Edge style: thin grey, highlight on hover/select
- [x] Loading state while layout computes
- [x] `SectionGroupNode.js` — custom node with header label bar + target handle
- [ ] Zoom-aware label legibility (future)
- [ ] Overall visual quality — **nothing looks great yet across all test sites**

### Interactivity
- [x] Click node → details panel (link to live URL, center view, toggle children)
- [x] Hash-based deep linking (`#nodeId` → jump to node)
- [x] Toggle children visibility (collapse/expand subtrees)
- [ ] Node dragging persists (resets on re-layout — future)

---

## Test sites
| Site | URLs | Structure | Notes |
|------|------|-----------|-------|
| `airam.fi/page-sitemap.xml` | ~21 | Shallow, multilingual | Simple, good baseline |
| `jalostaja.fi/sitemap_index.xml` | Multiple sections | Moderate depth | Sitemap index |
| `cricketlighters.com/sitemap.xml` | 92 (80+ in one section) | One huge flat section | Stress test for layouts |

---

## Hosting / backend
- [ ] Deploy to Vercel
- [ ] CORS / sitemap fetch issues on live URLs (may need proxy)

---

## Future / nice-to-have
- [ ] Share URL for a specific map state
- [ ] Edit / rename nodes, persist changes
- [ ] Export as PNG or PDF
