import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const request = target => new Request('http://localhost/api/discover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target }) });
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
});
