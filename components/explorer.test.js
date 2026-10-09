import { describe, it, expect } from 'vitest';
import { makeInitialData } from './helpers';
import { indexTree, initialCollapsed, ancestorIds, explorerLayout, displayLabel } from './explorer';

function fixture(paths) {
  const { initialNodes, initialEdges } = makeInitialData({ url: 'https://example.com/sitemap.xml', sites: paths.map(path => `https://example.com${path}`) });
  return indexTree(initialNodes, initialEdges);
}
function find(tree, label) { return [...tree.byId.values()].find(node => node.data.label === label).id; }

describe('sitemap explorer', () => {
  it('keeps Home and the toggled parent fixed across collection collapse in both themes', () => {
    const tree = fixture(['/', '/products', '/products/chairs', '/products/tables', '/blog', '/blog/post']);
    const root = find(tree, 'Home'), products = find(tree, 'products');
    for (const mode of ['regular', 'bare']) {
      const before = explorerLayout(tree, new Set(), 1.8, new Map(), { mode });
      const after = explorerLayout(tree, new Set([products]), 1.8, new Map(), { mode });
      for (const id of [root, products]) expect(after.nodes.find(n => n.id === id).position).toEqual(before.nodes.find(n => n.id === id).position);
      expect(after.nodes.find(n => n.id === `stack:${products}`).position.y).toBe(after.nodes.find(n => n.id === products).position.y);
    }
  });
  it('routes every hierarchy depth consistently in either direction without overlapping rectangles', () => {
    const tree = fixture(['/', '/products', '/products/furniture', '/products/furniture/chairs', '/products/furniture/tables', '/blog', '/blog/post']);
    for (const mode of ['regular', 'bare']) for (const direction of ['horizontal', 'vertical']) {
      const result = explorerLayout(tree, new Set(), 1.8, new Map(), { mode, direction });
      for (const edge of result.edges) {
        expect(Boolean(edge.data.horizontal)).toBe(direction === 'horizontal');
        expect(edge.type).toBe('treePath');
      }
      for (const a of result.nodes) for (const b of result.nodes) if (a.id !== b.id) {
        expect(a.position.x < b.position.x + b.width && a.position.x + a.width > b.position.x && a.position.y < b.position.y + b.height && a.position.y + a.height > b.position.y).toBe(false);
      }
    }
  });
  it('keeps Bare vertical children beyond the parent label centre at every depth', () => {
    const tree = fixture(['/', '/products', '/products/a-long-category-name', '/products/a-long-category-name/item', '/blog', '/blog/post']);
    for (const collapsed of [new Set(), initialCollapsed(tree)]) {
      const result = explorerLayout(tree, collapsed, 1.8, new Map(), { mode: 'bare', direction: 'vertical' });
      for (const edge of result.edges.filter(edge => !edge.data.fan)) {
        const parent = result.nodes.find(node => node.id === edge.source);
        const child = result.nodes.find(node => node.id === edge.target);
        expect(child.position.x).toBeGreaterThanOrEqual(parent.position.x + parent.width / 2 + 16 * 1.8);
      }
    }
  });
  it('formats URL-derived names while preserving acronyms and authored casing', () => {
    expect(displayLabel('our-products')).toBe('Our products');
    expect(displayLabel('faq')).toBe('FAQ');
    expect(displayLabel('caf%C3%A9_news')).toBe('Café news');
    expect(displayLabel('iPhone-support')).toBe('iPhone support');
    expect(displayLabel('bad%escape')).toBe('Bad%escape');
  });
  it('restores identical geometry and node data after root collapse/reopen', () => {
    const tree = fixture(['/', '/blog', '/blog/a', '/blog/b', '/blog/c', '/blog/d', '/about']);
    const collapsed = initialCollapsed(tree);
    const before = explorerLayout(tree, collapsed, 2.4);
    const root = find(tree, 'Home');
    collapsed.add(root);
    expect(explorerLayout(tree, collapsed, 2.4).nodes).toHaveLength(2);
    collapsed.delete(root);
    expect(explorerLayout(tree, collapsed, 2.4)).toEqual(before);
  });
  it('keeps a blog page separate from its collapsed article stack', () => {
    const tree = fixture(['/', '/blog', '/blog/a', '/blog/b', '/blog/c', '/blog/d']);
    const blog = find(tree, 'blog');
    const result = explorerLayout(tree, initialCollapsed(tree));
    expect(result.nodes.find(node => node.id === blog).type).toBe('page');
    expect(result.nodes.find(node => node.id === `stack:${blog}`).data.pageCount).toBe(4);
    expect(result.edges.some(edge => edge.source === blog && edge.target === `stack:${blog}`)).toBe(true);
    expect(result.nodes.some(node => node.id === find(tree, 'a'))).toBe(false);
  });
  it('preserves nested collapse when reopening a parent', () => {
    const tree = fixture(['/', '/blog', '/blog/archive', '/blog/archive/a', '/blog/archive/b']);
    const blog = find(tree, 'blog');
    const archive = find(tree, 'archive');
    const collapsed = new Set([blog, archive]);
    expect(explorerLayout(tree, collapsed).nodes.some(node => node.id === archive)).toBe(false);
    collapsed.delete(blog);
    const result = explorerLayout(tree, collapsed);
    expect(result.nodes.some(node => node.id === archive)).toBe(true);
    expect(result.nodes.some(node => node.id === `stack:${archive}`)).toBe(true);
    expect(result.nodes.some(node => node.id === find(tree, 'a'))).toBe(false);
  });
  it('rebuilds the full ancestry even when the display is collapsed', () => {
    const tree = fixture(['/', '/blog/archive/a']);
    expect(ancestorIds(tree, find(tree, 'a')).map(id => tree.byId.get(id).data.label)).toEqual(['archive', 'blog', 'Home']);
    const collapsed = initialCollapsed(tree);
    ancestorIds(tree, find(tree, 'a')).forEach(id => collapsed.delete(id));
    expect(explorerLayout(tree, collapsed).nodes.some(node => node.id === find(tree, 'a'))).toBe(true);
  });
  it('distinguishes inferred paths and counts only real pages in stacks', () => {
    const tree = fixture(['/', '/blog/archive/a', '/blog/archive/b']);
    const result = explorerLayout(tree, new Set([find(tree, 'blog')]));
    const stack = result.nodes.find(node => node.type === 'stack');
    expect(stack.data.pageCount).toBe(2);
    expect(stack.data.branchCount).toBe(3);
    expect(tree.byId.get(find(tree, 'blog')).url).toBeUndefined();
  });
  it('gives long labels more room and lays out 300 articles as one stack', () => {
    const long = 'a-very-long-page-name-that-needs-to-wrap-without-losing-the-rest-of-the-title';
    const tree = fixture(['/', '/blog', `/${long}`, ...Array.from({ length: 300 }, (_, i) => `/blog/article-${i}`)]);
    const result = explorerLayout(tree, initialCollapsed(tree), 2.2);
    expect(result.nodes).toHaveLength(4);
    expect(result.nodes.find(node => node.type === 'stack').data.pageCount).toBe(300);
    expect(result.nodes.find(node => node.id === find(tree, long)).height).toBeGreaterThan(76);
    for (const node of result.nodes) expect(Number.isFinite(node.position.x) && Number.isFinite(node.position.y)).toBe(true);
  });
  it('reveals large collections in batches and keeps accurate remainder counts', () => {
    const tree = fixture(['/', '/blog', ...Array.from({ length: 300 }, (_, i) => `/blog/article-${i}`)]);
    const blog = find(tree, 'blog');
    const first = explorerLayout(tree, new Set());
    expect(first.nodes.filter(node => node.url?.includes('/blog/article-'))).toHaveLength(12);
    expect(first.nodes.find(node => node.type === 'stack').data.pageCount).toBe(288);
    const next = explorerLayout(tree, new Set(), 1, new Map([[blog, 24]]));
    expect(next.nodes.filter(node => node.url?.includes('/blog/article-'))).toHaveLength(24);
    expect(next.nodes.find(node => node.type === 'stack').data.pageCount).toBe(276);
  });
  it('keeps the home page expanded in the initial overview', () => {
    const tree = fixture(['/', '/a', '/b', '/c', '/d', '/e']);
    expect(initialCollapsed(tree).has(find(tree, 'Home'))).toBe(false);
  });
  it('keeps all root children in one peer column with their stacks to the right', () => {
    const tree = fixture(['/', '/a', '/b', '/c', '/d', '/e', '/blog', '/blog/one', '/blog/two', '/blog/three', '/blog/four']);
    const result = explorerLayout(tree, initialCollapsed(tree));
    const root = result.nodes.find(node => node.data.isSiteRoot);
    const peers = tree.children.get(root.id).map(id => result.nodes.find(node => node.id === id));
    expect(new Set(peers.map(node => node.position.x)).size).toBe(1);
    expect(peers.every(node => node.position.x > root.position.x + root.width)).toBe(true);
    const blog = peers.find(node => node.data.label === 'blog');
    const stack = result.nodes.find(node => node.type === 'stack');
    expect(stack.position.x).toBeGreaterThan(blog.position.x + blog.width);
    expect(stack.position.y).toBe(blog.position.y);
    expect(result.edges.filter(edge => edge.source === root.id).every(edge => edge.sourceHandle === 'right' && edge.targetHandle === 'left')).toBe(true);
  });
  it('renders every page when expanded without overlapping node rectangles', () => {
    const tree = fixture(['/', '/a', '/a/deep', '/a/deep/one', '/a/deep/two', '/b', '/c', '/d', '/e']);
    const result = explorerLayout(tree, new Set());
    expect(result.nodes).toHaveLength(tree.byId.size);
    for (let i = 0; i < result.nodes.length; i++) {
      const a = result.nodes[i];
      for (const b of result.nodes.slice(i + 1)) {
        const overlaps = a.position.x < b.position.x + b.width && a.position.x + a.width > b.position.x && a.position.y < b.position.y + b.height && a.position.y + a.height > b.position.y;
        expect(overlaps).toBe(false);
      }
    }
  });
});


describe('large site overview', () => {
  const paths = ['/', ...Array.from({ length: 16 }, (_, i) => `/section-${i + 1}`),
    ...Array.from({ length: 14 }, (_, i) => `/${2013 + i}/02/post`), '/products/chairs', '/products/tables'];
  it('shows every first-level page and path without a root remainder stack in both directions', () => {
    const tree = fixture(paths);
    const root = find(tree, 'Home');
    for (const mode of ['regular', 'bare']) for (const direction of ['horizontal', 'vertical']) {
      const result = explorerLayout(tree, initialCollapsed(tree), 1.8, new Map(), { mode, direction });
      expect(tree.children.get(root).every(id => result.nodes.some(node => node.id === id))).toBe(true);
      expect(result.nodes.some(node => node.id === `stack:${root}`)).toBe(false);
      const rootEdges = result.edges.filter(edge => edge.source === root);
      expect(rootEdges).toHaveLength(tree.children.get(root).length);
      if (direction === 'vertical') {
        expect(rootEdges.every(edge => edge.data.fan && edge.sourceHandle === 'bottom' && edge.targetHandle === 'top')).toBe(true);
        expect(new Set(tree.children.get(root).map(id => result.nodes.find(n => n.id === id).position.y)).size).toBe(1);
      }
      for (let i = 0; i < result.nodes.length; i++) for (const b of result.nodes.slice(i + 1)) {
        const a = result.nodes[i];
        expect(a.position.x < b.position.x + b.width && a.position.x + a.width > b.position.x && a.position.y < b.position.y + b.height && a.position.y + a.height > b.position.y).toBe(false);
      }
    }
  });
  it('sorts named sections naturally before newest-first date folders without losing ancestry', () => {
    const tree = fixture(paths);
    const siblings = tree.children.get(find(tree, 'Home')).map(id => tree.byId.get(id));
    expect(siblings[0].data.label).toBe('products');
    expect(siblings[1].data.label).toBe('section-1');
    expect(siblings[2].data.label).toBe('section-2');
    expect(siblings.slice(17).map(node => node.data.label)).toEqual(Array.from({ length: 14 }, (_, i) => String(2026 - i)));
    expect(tree.byId.get(find(tree, '02')).data.fullPath).toBe('/2013/02');
  });
  it('records full inferred paths even when segments repeat', () => {
    const tree = fixture(['/', '/archive/archive/post']);
    expect([...tree.byId.values()].filter(node => node.data.label === 'archive').map(node => node.data.fullPath)).toEqual(['/archive', '/archive/archive']);
  });
});
