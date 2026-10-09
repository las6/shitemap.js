// Shared with the browser so graph construction has the same bounds as loading.
export const SITEMAP_LIMITS = Object.freeze({
  fileBytes: 10 * 1024 * 1024,
  totalBytes: 20 * 1024 * 1024,
  documents: 50,
  pages: 10000,
  nodes: 15000,
  rootChildren: 500,
  depth: 32,
  indexDepth: 8,
  xmlDepth: 64,
  xmlElements: 200000,
  urlLength: 2048,
  concurrency: 3,
  redirects: 3,
  timeoutMs: 45000,
  documentTimeoutMs: 15000,
});

export class SitemapError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.name = 'SitemapError';
    this.code = code;
    this.status = status;
  }
}

export function limitError(code, message) {
  return new SitemapError(code, message, 413);
}

// Match the existing graph's path projection, including cross-origin entries.
export function graphSegments(value, firstPage) {
  const reference = new URL(firstPage);
  const base = `${reference.protocol}//${reference.hostname}`;
  return value.replace(base, '').replace(/\/$/, '').split('/');
}

export function assertGraphBudget(sites, limits = SITEMAP_LIMITS) {
  if (sites.length > limits.pages) throw limitError('page_limit', `This sitemap has more than ${limits.pages.toLocaleString('en')} pages. Try a smaller child sitemap.`);
  const paths = new Set();
  const firstLevel = new Set();
  for (const value of sites) {
    if (value.length > limits.urlLength) throw limitError('url_limit', 'This sitemap contains a URL that is too long to display.');
    const segments = graphSegments(value, sites[0]);
    if (segments.length > 1) firstLevel.add(JSON.stringify(segments.slice(0, 2)));
    if (firstLevel.size > limits.rootChildren) throw limitError('wide_map_limit', 'This map has more than 500 first-level branches to display. Try a smaller child sitemap.');
    if (segments.length > limits.depth + 1) throw limitError('path_depth_limit', 'This sitemap contains paths that are too deeply nested to display.');
    for (let i = 1; i <= segments.length; i++) {
      paths.add(JSON.stringify(segments.slice(0, i)));
      if (paths.size > limits.nodes) throw limitError('node_limit', `This map needs more than ${limits.nodes.toLocaleString('en')} page and folder nodes. Try a smaller child sitemap.`);
    }
  }
}
