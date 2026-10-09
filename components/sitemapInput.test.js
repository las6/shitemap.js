import { describe, expect, it } from 'vitest';
import { decodeSitemapUrl, encodeSitemapUrl, isSitemapUrl, normalizeSiteInput, validateSitemapData } from './sitemapInput';

describe('website entry', () => {
  it('accepts domains and preserves supplied paths and queries', () => {
    expect(normalizeSiteInput(' example.com ')).toBe('https://example.com/');
    expect(normalizeSiteInput('www.example.com/about?q=hello#heading')).toBe('https://www.example.com/about?q=hello');
    expect(normalizeSiteInput('http://localhost:3000/sitemap.xml')).toBe('http://localhost:3000/sitemap.xml');
    expect(normalizeSiteInput('//example.com')).toBe('https://example.com/');
  });
  it.each(['', 'example', 'not a domain', 'ftp://example.com', 'https://user:password@example.com', 'https://'])('rejects unusable input: %s', value => {
    expect(() => normalizeSiteInput(value)).toThrow();
  });
  it('recognizes XML, compressed and extensionless sitemap URLs', () => {
    expect(isSitemapUrl('https://example.com/sitemap_index.xml?version=2')).toBe(true);
    expect(isSitemapUrl('https://example.com/sitemap.xml.gz')).toBe(true);
    expect(isSitemapUrl('https://example.com/sitemap')).toBe(true);
    expect(isSitemapUrl('https://example.com/about')).toBe(false);
  });
  it('roundtrips Unicode sitemap links', () => {
    const url = 'https://example.com/芬兰.xml';
    expect(decodeSitemapUrl(encodeSitemapUrl(url))).toBe(url);
    expect(() => decodeSitemapUrl('%%%')).toThrow();
  });
});

describe('sitemap graph validation', () => {
  it('rejects empty results but preserves usable partial sitemap indexes with a warning', () => {
    expect(() => validateSitemapData({ sites: [] })).toThrow('no pages');
    const result = validateSitemapData({ sites: ['https://example.com/'], errors: [{ url: 'failed.xml' }] });
    expect(result.sites).toEqual(['https://example.com/']);
    expect(result.warnings[0]).toContain('may be incomplete');
  });
  it.each([undefined, '/relative', 'not a URL', 'javascript:alert(1)', 'ftp://example.com/', 'https://user:secret@example.com/'])('rejects malformed page locations: %s', value => {
    expect(() => validateSitemapData({ sites: [value] })).toThrow('no valid page URLs');
  });
  it('skips invalid page locations and retains the warning on client revalidation', () => {
    const result = validateSitemapData({ sites: ['https://example.com/', '/relative'], errors: [] });
    expect(result.sites).toEqual(['https://example.com/']);
    expect(result.warnings).toEqual(['1 invalid page URL was skipped.']);
    expect(validateSitemapData(result).warnings).toEqual(result.warnings);
  });
  it('deduplicates valid locations before graph construction', () => {
    expect(validateSitemapData({ sites: ['https://example.com/', 'https://example.com/'], errors: [] }).sites).toEqual(['https://example.com/']);
  });
});
