import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const request = target => new Request('http://localhost/api/discover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target }) });
vi.mock('../../../components/apiQuota', () => ({ enforceApiQuota: vi.fn(async () => {}) }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Kurkelo discovery integration', () => {
  it('sends only sitemap discovery with server-side bearer auth and preserves status', async () => {
    vi.stubEnv('KURKELO_URL', 'https://discovery.example.com');
    vi.stubEnv('KURKELO_API_KEY', 'test-only-secret');
    const discovery = { status: 'partial', observedAt: '2026-10-08T10:00:00Z', cache: 'hit', stale: true };
    const fetcher = vi.fn(async () => Response.json({ site: { sitemaps: ['https://example.com/index.xml', 'https://example.com/other.xml', 'https://example.com/index.xml'], status: { sitemaps: discovery } } }));
    vi.stubGlobal('fetch', fetcher);
    const response = await POST(request('example.com/about'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locations: ['https://example.com/index.xml', 'https://example.com/other.xml'], discovery });
    const [endpoint, options] = fetcher.mock.calls[0];
    expect(endpoint.href).toBe('https://discovery.example.com/api/discover');
    expect(options.headers.authorization).toBe('Bearer test-only-secret');
    expect(JSON.parse(options.body)).toEqual({ target: 'https://example.com/about', include: ['sitemaps'], detail: 'compact' });
  });
  it('rejects invalid input before any network request', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect((await POST(request('not a domain'))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('offers manual XML entry when production discovery is unconfigured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('KURKELO_URL', '');
    const response = await POST(request('example.com'));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('paste a sitemap XML URL');
  });
  it.each([401, 503])('handles a failed Kurkelo API without leaking its response: %s', async status => {
    vi.stubEnv('KURKELO_URL', 'https://discovery.example.com');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'private diagnostic' } }, { status })));
    const response = await POST(request('example.com'));
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('private diagnostic');
  });
  it('preserves a blocked collector result even though Kurkelo returned HTTP 200', async () => {
    vi.stubEnv('KURKELO_URL', 'https://discovery.example.com');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ site: { status: { sitemaps: { status: 'blocked' } } } })));
    expect(await (await POST(request('example.com'))).json()).toEqual({ locations: [], discovery: { status: 'blocked' } });
  });
  it('bounds discovery request bodies before calling Kurkelo', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await POST(request('a'.repeat(5000)));
    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe('request_byte_limit');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not follow a Kurkelo redirect carrying the service credential', async () => {
    vi.stubEnv('KURKELO_URL', 'https://discovery.example.com');
    const fetcher = vi.fn(async () => { throw new TypeError('redirect refused'); }); vi.stubGlobal('fetch', fetcher);
    expect((await POST(request('example.com'))).status).toBe(502);
    expect(fetcher.mock.calls[0][1].redirect).toBe('error');
  });
  it('preserves upstream quota responses and retry guidance', async () => {
    vi.stubEnv('KURKELO_URL', 'https://discovery.example.com');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 429, headers: { 'retry-after': '20' } })));
    const response = await POST(request('example.com'));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('20');
    expect((await response.json()).code).toBe('discovery_rate_limited');
  });
  it('bounds service response size and does not expose private diagnostics', async () => {
    vi.stubEnv('KURKELO_URL', 'https://discovery.example.com');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x'.repeat(300000))));
    const response = await POST(request('example.com'));
    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe('discovery_response_limit');
  });
});
