// Run independently: pnpm exec vitest run scripts/benchmark-sitemaps.test.js
// Generated measurements stay in ignored output/. No external requests.
import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { performance } from 'node:perf_hooks';
import { ValidatedSitemapper } from '../components/sitemapServer';
import { createSitemapFetcher } from '../components/sitemapNetwork';
import { makeInitialData } from '../components/helpers';
import { indexTree, initialCollapsed, explorerLayout } from '../components/explorer';
import { SITEMAP_LIMITS } from '../components/sitemapLimits';

describe('sitemap resource fixtures', () => {
  it('measures bounded large/deep/wide inventories and near-10-MiB XML', async () => {
    const records = [];
    const cases = [
      ['small', Array.from({ length: 100 }, (_, i) => `/section/page-${i}`)],
      ['large', Array.from({ length: 10000 }, (_, i) => `/section-${Math.floor(i / 100)}/page-${i}`)],
      ['wide', Array.from({ length: 500 }, (_, i) => `/page-${i}`)],
      ['deep', Array.from({ length: 100 }, (_, i) => `/${'folder/'.repeat(30)}page-${i}`)],
      ['near-file-limit', ['/']],
    ];
    for (const [name, paths] of cases) {
      let xml = `<urlset>${paths.map(path => `<url><loc>https://example.com${path}</loc></url>`).join('')}</urlset>`;
      if (name === 'near-file-limit') xml = xml.replace('<urlset>', `<urlset><!--${'x'.repeat(SITEMAP_LIMITS.fileBytes - Buffer.byteLength(xml) - 7)}-->`);
      const fetchDocument = createSitemapFetcher({ resolver: async () => [{ address: '8.8.8.8', family: 4 }], transport: async () => {
        const stream = Readable.from([Buffer.from(xml)]); stream.statusCode = 200; stream.headers = {}; return stream;
      } });
      const start = performance.now();
      const inventory = await new ValidatedSitemapper({ fetchDocument }).fetch('https://example.com/sitemap.xml');
      const loaded = performance.now();
      const { initialNodes, initialEdges } = makeInitialData(inventory);
      const built = performance.now();
      const tree = indexTree(initialNodes, initialEdges);
      const layout = explorerLayout(tree, initialCollapsed(tree), 1.8);
      const finished = performance.now();
      expect(inventory.sites).toHaveLength(paths.length);
      expect(initialNodes.length).toBeLessThanOrEqual(SITEMAP_LIMITS.nodes);
      records.push({ fixture: name, xmlBytes: Buffer.byteLength(xml), pages: inventory.sites.length, nodes: initialNodes.length, visibleNodes: layout.nodes.length, loadParseMs: Math.round(loaded - start), treeMs: Math.round(built - loaded), indexLayoutMs: Math.round(finished - built), rssMiB: Math.round(process.memoryUsage().rss / 1024 / 1024) });
    }
    await mkdir('output/hardening', { recursive: true });
    await writeFile('output/hardening/benchmarks.json', JSON.stringify({ measuredAt: new Date().toISOString(), node: process.version, note: 'Synthetic Node fixtures. RSS is sampled after each case in one process, not isolated peak memory or browser rendering. Timings are local observations, not guarantees.', records }, null, 2));
  }, 15000);
});
