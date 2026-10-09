import { afterEach, describe, expect, it, vi } from 'vitest';
import { SitemapError } from '../../../components/sitemapLimits';
import { GET } from './route';
import { enforceApiQuota } from '../../../components/apiQuota';
import { ValidatedSitemapper } from '../../../components/sitemapServer';

vi.mock('../../../components/apiQuota', () => ({ enforceApiQuota: vi.fn(async () => {}) }));
vi.mock('../../../components/sitemapServer', () => ({ ValidatedSitemapper: vi.fn() }));
const request = url => ({ nextUrl: new URL(`http://localhost/api/sitemapper?url=${encodeURIComponent(url)}`), signal: new AbortController().signal, headers: new Headers() });
afterEach(() => vi.clearAllMocks());
describe('hardened sitemap API', () => {
  it('returns structured limits with child choices and no cached partial inventory', async () => {
    const error = new SitemapError('page_limit', 'Too many pages. Choose a child sitemap.', 413);
    error.candidates = ['https://example.com/child.xml'];
    ValidatedSitemapper.mockImplementation(function () { this.fetch = async () => { throw error; }; });
    const response = await GET(request('https://example.com/index.xml'));
    const data = await response.json();
    expect(response.status).toBe(413); expect(data.code).toBe('page_limit'); expect(data.candidates).toEqual(error.candidates);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBe(data.requestId);
    expect(data.sites).toBeUndefined();
  });
  it('checks quotas before constructing a fetcher and supplies Retry-After', async () => {
    const error = new SitemapError('rate_limited', 'Please wait.', 429); error.retryAfter = 60;
    enforceApiQuota.mockRejectedValueOnce(error);
    const response = await GET(request('https://example.com/index.xml'));
    expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('60');
    expect(ValidatedSitemapper).not.toHaveBeenCalled();
  });
  it('does not cache incomplete or query-bearing results', async () => {
    ValidatedSitemapper.mockImplementation(function () { this.fetch = async () => ({ sites: ['https://example.com/'], errors: [{ code: 'upstream_http' }] }); });
    expect((await GET(request('https://example.com/index.xml'))).headers.get('cache-control')).toBe('no-store');
    ValidatedSitemapper.mockImplementation(function () { this.fetch = async () => ({ sites: ['https://example.com/'] }); });
    expect((await GET(request('https://example.com/index.xml?token=secret'))).headers.get('cache-control')).toBe('no-store');
  });
  it('does not return internal errors or inspected URL secrets', async () => {
    ValidatedSitemapper.mockImplementation(function () { this.fetch = async () => { throw new Error('private server data'); }; });
    const response = await GET(request('https://example.com/index.xml'));
    expect(response.status).toBe(502); expect(JSON.stringify(await response.json())).not.toContain('private server data');
  });
});
