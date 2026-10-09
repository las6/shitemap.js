import { afterEach, describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { ValidatedSitemapper } from './sitemapServer';
import { validateSitemapData } from './sitemapInput';

const sitemap = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/about?a=1&amp;b=2</loc></url></urlset>';
afterEach(() => vi.unstubAllGlobals());

describe('strict sitemap loading', () => {
  it('expands indexes and decodes compressed XML and URL entities', async () => {
    const fetcher = vi.fn(async url => new Response(String(url).endsWith('index.xml')
      ? '<sitemapindex><sitemap><loc>https://example.com/pages.xml.gz</loc></sitemap></sitemapindex>'
      : gzipSync(sitemap)));
    vi.stubGlobal('fetch', fetcher);
    const result = validateSitemapData(await new ValidatedSitemapper().fetch('https://example.com/index.xml'));
    expect(result.sites).toEqual(['https://example.com/about?a=1&b=2']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    '<html><body>Not a sitemap</body></html>',
    '<urlset><url><loc>https://example.com/</loc></url>',
    '<urlset><url><loc>https://example.com/</loc></url></urlset><html/>',
    '<!DOCTYPE urlset [<!ENTITY site "https://example.com/">]><urlset><url><loc>&site;</loc></url></urlset>',
  ])('rejects HTML and malformed or unsupported XML', async xml => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(xml)));
    const result = await new ValidatedSitemapper().fetch('https://example.com/sitemap.xml');
    expect(result.sites).toEqual([]);
    expect(result.errors).not.toHaveLength(0);
  });
  it('keeps valid pages with a warning when a child sitemap fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).endsWith('index.xml')) return new Response('<sitemapindex><sitemap><loc>https://example.com/ok.xml</loc></sitemap><sitemap><loc>https://example.com/missing.xml</loc></sitemap></sitemapindex>');
      return String(url).endsWith('ok.xml') ? new Response(sitemap) : new Response('Not found', { status: 404 });
    }));
    const result = await new ValidatedSitemapper().fetch('https://example.com/index.xml');
    expect(result.sites).toHaveLength(1);
    expect(validateSitemapData(result).warnings[0]).toContain('may be incomplete');
  });
  it('stops cyclic index references and refuses an empty graph', async () => {
    const fetcher = vi.fn(async () => new Response('<sitemapindex><sitemap><loc>https://example.com/index.xml</loc></sitemap></sitemapindex>'));
    vi.stubGlobal('fetch', fetcher);
    const result = await new ValidatedSitemapper().fetch('https://example.com/index.xml');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(() => validateSitemapData(result)).toThrow('no pages');
  });
  it('preserves usable pages inside a nested partial index', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      if (String(url).endsWith('root.xml')) return new Response('<sitemapindex><sitemap><loc>https://example.com/nested.xml</loc></sitemap></sitemapindex>');
      if (String(url).endsWith('nested.xml')) return new Response('<sitemapindex><sitemap><loc>https://example.com/ok.xml</loc></sitemap><sitemap><loc>https://example.com/missing.xml</loc></sitemap></sitemapindex>');
      return String(url).endsWith('ok.xml') ? new Response(sitemap) : new Response('Not found', { status: 404 });
    }));
    const result = await new ValidatedSitemapper().fetch('https://example.com/root.xml');
    expect(result.sites).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(validateSitemapData(result).warnings).toHaveLength(1);
  });
});
