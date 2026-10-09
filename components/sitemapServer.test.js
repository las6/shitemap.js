import { afterEach, describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { assertXmlBudget, ValidatedSitemapper } from './sitemapServer';
import { SITEMAP_LIMITS } from './sitemapLimits';
import { createSitemapFetcher } from './sitemapNetwork';
import { validateSitemapData } from './sitemapInput';

const pageXml = (...pages) => `<urlset>${pages.map(page => `<url><loc>${page}</loc></url>`).join('')}</urlset>`;
const indexXml = (...files) => `<sitemapindex>${files.map(file => `<sitemap><loc>https://example.com/${file}</loc></sitemap>`).join('')}</sitemapindex>`;
const sitemap = pageXml('https://example.com/about?a=1&amp;b=2');
function loader(respond) {
  const transport = vi.fn(async url => {
    const value = await respond(url.href);
    const response = Readable.from([Buffer.isBuffer(value) ? value : Buffer.from(value.body ?? value)]);
    response.statusCode = value.status || 200;
    response.headers = value.headers || {};
    return response;
  });
  return { fetchDocument: createSitemapFetcher({ resolver: async () => [{ address: '8.8.8.8', family: 4 }], transport }), transport };
}
afterEach(() => vi.unstubAllEnvs());

describe('bounded sitemap loading', () => {
  it('bounds XML depth before parsing and ignores tag-like comments/CDATA', () => {
    expect(() => assertXmlBudget('<x>'.repeat(65) + '</x>'.repeat(65), SITEMAP_LIMITS)).toThrow('deeply nested');
    expect(() => assertXmlBudget('<urlset><!-- <fake> --><url><![CDATA[<fake>]]></url></urlset>', { ...SITEMAP_LIMITS, xmlDepth: 2 })).not.toThrow();
    expect(() => assertXmlBudget('<urlset><url/></urlset>', { ...SITEMAP_LIMITS, xmlElements: 1 })).toThrow('too many elements');
  });
  it('expands indexes and decodes compressed XML and entities', async () => {
    const mock = loader(url => url.endsWith('index.xml') ? indexXml('pages.xml.gz') : gzipSync(sitemap));
    const result = validateSitemapData(await new ValidatedSitemapper(mock).fetch('https://example.com/index.xml'));
    expect(result.sites).toEqual(['https://example.com/about?a=1&b=2']);
    expect(mock.transport).toHaveBeenCalledTimes(2);
  });
  it.each([
    '<html><body>Not a sitemap</body></html>',
    '<urlset><url><loc>https://example.com/</loc></url>',
    '<urlset/><html/>',
    '<!DOCTYPE urlset [<!ENTITY site "https://example.com/">]><urlset><url><loc>&site;</loc></url></urlset>',
  ])('rejects invalid/unsupported XML without returning pages', async xml => {
    await expect(new ValidatedSitemapper(loader(() => xml)).fetch('https://example.com/sitemap.xml')).rejects.toMatchObject({ code: 'invalid_xml' });
  });
  it('preserves usable pages inside a nested partial index', async () => {
    const mock = loader(url => url.endsWith('root.xml') ? indexXml('nested.xml') : url.endsWith('nested.xml') ? indexXml('ok.xml', 'missing.xml') : url.endsWith('ok.xml') ? sitemap : { body: 'Not found', status: 404 });
    const result = await new ValidatedSitemapper(mock).fetch('https://example.com/root.xml');
    expect(result.sites).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(validateSitemapData(result).warnings[0]).toContain('may be incomplete');
  });
  it('does not fetch a private child and marks the result incomplete', async () => {
    const mock = loader(url => url.endsWith('index.xml') ? '<sitemapindex><sitemap><loc>http://127.0.0.1/private</loc></sitemap><sitemap><loc>https://example.com/ok.xml</loc></sitemap></sitemapindex>' : sitemap);
    const result = await new ValidatedSitemapper(mock).fetch('https://example.com/index.xml');
    expect(mock.transport).toHaveBeenCalledTimes(2);
    expect(result.errors[0].code).toBe('blocked_destination');
    expect(result.sites).toHaveLength(1);
  });
  it('stops cycles without scheduling the same URL twice', async () => {
    const mock = loader(() => indexXml('index.xml'));
    const result = await new ValidatedSitemapper(mock).fetch('https://example.com/index.xml');
    expect(mock.transport).toHaveBeenCalledTimes(1);
    expect(() => validateSitemapData(result)).toThrow('no pages');
  });
  it('fails a document budget with child choices, not a truncated success', async () => {
    const mock = loader(() => indexXml('a.xml', 'b.xml', 'c.xml'));
    await expect(new ValidatedSitemapper({ ...mock, limits: { documents: 2 } }).fetch('https://example.com/index.xml')).rejects.toMatchObject({ code: 'document_limit', status: 413, candidates: ['https://example.com/a.xml', 'https://example.com/b.xml'] });
    expect(mock.transport).toHaveBeenCalledTimes(1);
  });
  it('bounds nested index depth', async () => {
    const mock = loader(url => url.endsWith('root.xml') ? indexXml('nested.xml') : indexXml('leaf.xml'));
    await expect(new ValidatedSitemapper({ ...mock, limits: { indexDepth: 1 } }).fetch('https://example.com/root.xml')).rejects.toMatchObject({ code: 'index_depth_limit' });
    expect(mock.transport).toHaveBeenCalledTimes(2);
  });
  it('counts unique pages and fails before returning excess pages', async () => {
    const mock = loader(() => pageXml('https://example.com/', 'https://example.com/', 'https://example.com/about'));
    const result = await new ValidatedSitemapper({ ...mock, limits: { pages: 2 } }).fetch('https://example.com/pages.xml');
    expect(result.sites).toHaveLength(2);
    await expect(new ValidatedSitemapper({ ...mock, limits: { pages: 1 } }).fetch('https://example.com/pages.xml')).rejects.toMatchObject({ code: 'page_limit', status: 413 });
  });
  it('bounds generated folders and path depth before sending inventory', async () => {
    const mock = loader(() => pageXml('https://example.com/a/b/c'));
    await expect(new ValidatedSitemapper({ ...mock, limits: { nodes: 3 } }).fetch('https://example.com/pages.xml')).rejects.toMatchObject({ code: 'node_limit' });
    await expect(new ValidatedSitemapper({ ...mock, limits: { depth: 2 } }).fetch('https://example.com/pages.xml')).rejects.toMatchObject({ code: 'path_depth_limit' });
  });
  it('bounds a broad first level before browser layout', async () => {
    const mock = loader(() => pageXml('https://example.com/a', 'https://example.com/b'));
    await expect(new ValidatedSitemapper({ ...mock, limits: { rootChildren: 1 } }).fetch('https://example.com/pages.xml')).rejects.toMatchObject({ code: 'wide_map_limit' });
  });
  it('rejects wire bytes, gzip bombs, and aggregate decoded bytes', async () => {
    await expect(new ValidatedSitemapper({ ...loader(() => sitemap), limits: { fileBytes: 10 } }).fetch('https://example.com/pages.xml')).rejects.toMatchObject({ code: 'file_byte_limit' });
    const xml = pageXml(`https://example.com/${'a'.repeat(1000)}`);
    await expect(new ValidatedSitemapper({ ...loader(() => gzipSync(xml)), limits: { fileBytes: 200 } }).fetch('https://example.com/pages.xml.gz')).rejects.toMatchObject({ code: 'file_byte_limit' });
    const mock = loader(url => url.endsWith('index.xml') ? indexXml('a.xml', 'b.xml') : gzipSync(sitemap));
    await expect(new ValidatedSitemapper({ ...mock, limits: { totalBytes: 250 } }).fetch('https://example.com/index.xml')).rejects.toMatchObject({ code: 'total_byte_limit' });
  });
  it('uses one global concurrency budget across nested indexes', async () => {
    let active = 0, peak = 0;
    const mock = loader(async url => {
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      active--;
      if (url.endsWith('root.xml')) return indexXml('a.xml', 'b.xml', 'c.xml');
      if (/\/[abc]\.xml$/.test(url)) return indexXml(`${url.at(-5)}1.xml`, `${url.at(-5)}2.xml`);
      return sitemap;
    });
    await new ValidatedSitemapper({ ...mock, limits: { concurrency: 2 } }).fetch('https://example.com/root.xml');
    expect(peak).toBe(2);
  });
  it('cancels all active documents and stops scheduling on the operation deadline', async () => {
    let started = 0, cancelled = 0;
    const fetchDocument = async (url, { signal }) => {
      started++;
      if (url.endsWith('root.xml')) return { buffer: Buffer.from(indexXml('a.xml', 'b.xml', 'c.xml', 'd.xml')) };
      return new Promise((_, reject) => signal.addEventListener('abort', () => { cancelled++; reject(signal.reason); }, { once: true }));
    };
    await expect(new ValidatedSitemapper({ fetchDocument, limits: { timeoutMs: 20, concurrency: 2 } }).fetch('https://example.com/root.xml')).rejects.toMatchObject({ code: 'timeout', status: 504 });
    expect(started).toBe(3);
    expect(cancelled).toBe(2);
  });
  it('reads only the bundled development fixture without opening network access', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const fetchDocument = vi.fn();
    const result = await new ValidatedSitemapper({ fetchDocument }).fetch('http://localhost:3000/sitemap-review.xml');
    expect(result.sites).toHaveLength(104);
    expect(fetchDocument).not.toHaveBeenCalled();
    vi.stubEnv('NODE_ENV', 'production');
    await expect(new ValidatedSitemapper({ fetchDocument }).fetch('http://localhost:3000/sitemap-review.xml')).rejects.toMatchObject({ code: 'blocked_destination' });
  });
});
