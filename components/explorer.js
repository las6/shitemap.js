import { EXPLORER_METRICS as M } from './explorerStyle';

// The URL tree is the source of truth. Collection nodes exist only in the view.
export function indexTree(nodes, edges) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const children = new Map(nodes.map(node => [node.id, []]));
  const parent = new Map();
  edges.forEach(({ source, target }) => {
    if (byId.has(source) && byId.has(target)) {
      children.get(source).push(target);
      parent.set(target, source);
    }
  });
  for (const siblings of children.values()) siblings.sort((a, b) => comparePages(byId.get(a), byId.get(b)));
  return { byId, children, parent };
}

// Put named sections before date archives without pretending to know business
// importance. Natural alphabetical ordering is stable within named siblings;
// dates are newest first. Source sitemap nodes and IDs are never reordered.
const nameOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
function archiveDate(node) {
  const path = node.data.fullPath || node.data.label;
  return /^\/?(?:19|20)\d{2}(?:\/(?:0?[1-9]|1[0-2]))?(?:\/(?:0?[1-9]|[12]\d|3[01]))?\/?$/.test(path);
}
export function comparePages(a, b) {
  const archiveA = archiveDate(a), archiveB = archiveDate(b);
  if (archiveA !== archiveB) return archiveA ? 1 : -1;
  const result = nameOrder.compare(a.data.label, b.data.label);
  return archiveA ? -result : result;
}

export function initialCollapsed(tree) {
  return new Set([...tree.children].filter(([id, kids]) =>
    kids.length && tree.byId.get(id).data.depth > 0 && (kids.length >= 4 || tree.byId.get(id).data.depth >= 2)
  ).map(([id]) => id));
}

export function ancestorIds(tree, id) {
  const result = [];
  const visited = new Set([id]);
  let current = tree.parent.get(id);
  while (current && !visited.has(current)) {
    visited.add(current);
    result.push(current);
    current = tree.parent.get(current);
  }
  return result;
}

export function descendantIds(tree, id) {
  const result = [];
  const visited = new Set([id]);
  const pending = [...(tree.children.get(id) || [])];
  while (pending.length) {
    const current = pending.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    pending.push(...(tree.children.get(current) || []));
  }
  return result;
}

// Display names are presentation only; IDs and original URLs stay untouched.
export function displayLabel(label) {
  let text = String(label || '');
  try { text = decodeURIComponent(text); } catch { /* Keep malformed escapes readable. */ }
  text = text.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 'Home';
  text = text.replace(/\b(faq|api|seo|pdf|xml|html|crm|b2b|b2c)\b/gi, word => word.toUpperCase());
  return /[A-Z]/.test(text) ? text : text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function dimensions(label, scale, hasChildren, root, bare) {
  const control = hasChildren && !bare ? M.controlWidth : 0;
  const width = root ? M.rootWidth * scale : Math.min(M.maxWidth, Math.max(M.minWidth, label.length * M.fontSize * .58 + control + 2 * M.padding)) * scale;
  const lines = Math.max(1, Math.ceil(label.length * M.fontSize * .58 / (width / scale - control - 2 * M.padding)));
  return { width, height: (lines * M.rowHeight + 24 + 20) * scale };
}

// Same source tree for both themes. A common first-row anchor makes page labels,
// roots and synthetic collections interchangeable without moving their parents.
export function explorerLayout(tree, collapsed, scale = 1, limits = new Map(), options = {}) {
  const { mode = 'regular', direction = 'horizontal' } = options;
  const bare = mode === 'bare';
  const horizontal = direction === 'horizontal';
  const nodes = [], edges = [], visited = new Set();
  const gap = M.columnGap * scale, siblingGap = M.siblingGap * scale;
  function branch(id, x, y) {
    if (visited.has(id)) return { width: 0, height: 0 };
    visited.add(id);
    const raw = tree.byId.get(id), kids = tree.children.get(id) || [];
    const root = !tree.parent.has(id), label = root ? 'Home' : displayLabel(raw.data.label);
    const dims = dimensions(label, scale, kids.length > 0, root, bare);
    nodes.push({ ...raw, type: 'page', position: { x, y }, ...dims, style: dims,
      data: { ...raw.data, displayLabel: label, isSiteRoot: root, isTopLevel: tree.parent.has(id) && !tree.parent.has(tree.parent.get(id)), childCount: kids.length, collapsed: collapsed.has(id) } });
    if (root && !horizontal && !collapsed.has(id) && kids.length) {
      const rootNode = nodes[nodes.length - 1];
      let nextX = x, maxHeight = 0;
      for (const kid of kids) {
        const size = branch(kid, nextX, y + dims.height + gap);
        edges.push({ id: `${id}->${kid}`, source: id, target: kid, type: 'treePath',
          sourceHandle: 'bottom', targetHandle: 'top', data: { fan: true, spineY: y + dims.height + gap / 2 } });
        nextX += size.width + siblingGap;
        maxHeight = Math.max(maxHeight, size.height);
      }
      const width = Math.max(dims.width, nextX - x - siblingGap);
      rootNode.position.x = x + (width - dims.width) / 2;
      return { width, height: dims.height + gap + maxHeight };
    }
    let width = dims.width, height = dims.height, offset = 0;
    // Reserve clearance beyond the widest possible label centre so the straight
    // Bare stem cannot pass through a child, even when labels wrap or fonts load.
    const indent = bare ? dims.width / 2 + 16 * scale : 32 * scale;
    const childX = horizontal ? x + dims.width + gap : x + indent;
    const childY = horizontal ? y : y + dims.height + siblingGap;
    const connect = target => edges.push({ id: `${id}->${target}`, source: id, target, type: 'treePath',
      sourceHandle: horizontal ? 'right' : 'branch', targetHandle: 'left',
      data: { horizontal, bareBranch: bare && !horizontal, spineX: horizontal ? childX - gap / 2 : childX - 16 * scale } });
    const addStack = (hidden, remaining) => {
      const descendants = hidden.flatMap(kid => [kid, ...descendantIds(tree, kid)]);
      const pageCount = descendants.filter(kid => tree.byId.get(kid).url).length;
      const label = `${pageCount} more ${pageCount === 1 ? 'page' : 'pages'}`;
      const stackId = `stack:${id}`, size = dimensions(label, scale, false, false, bare);
      nodes.push({ id: stackId, type: 'stack', position: { x: childX, y: childY + offset }, ...size, style: size,
        data: { label, parentId: id, pageCount, remaining, nextCount: Math.min(M.batchSize, hidden.length), childCount: hidden.length, branchCount: descendants.length } });
      connect(stackId);
      offset += size.height + M.stackOffset * scale + siblingGap;
      width = Math.max(width, childX - x + size.width + M.stackOffset * scale);
    };
    if (kids.length && collapsed.has(id)) addStack(kids, false);
    else {
      const limit = root ? kids.length : (limits.get(id) || M.batchSize);
      for (const kid of kids.slice(0, limit)) {
        const size = branch(kid, childX, childY + offset);
        connect(kid); offset += size.height + siblingGap;
        width = Math.max(width, childX - x + size.width);
      }
      if (kids.length > limit) addStack(kids.slice(limit), true);
    }
    if (offset) height = Math.max(height, childY - y + offset - siblingGap);
    return { width, height };
  }
  let y = 0;
  for (const id of tree.byId.keys()) if (!tree.parent.has(id)) {
    const size = branch(id, 0, y); y += size.height + gap;
  }
  return { nodes, edges };
}
