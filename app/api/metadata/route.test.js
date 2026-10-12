import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { enforceApiQuota } from '../../../components/apiQuota';
import { SitemapError } from '../../../components/sitemapLimits';

vi.mock('../../../components/apiQuota', () => ({ enforceApiQuota: vi.fn(async () => {}) }));
const request = target => new Request('http://localhost/api/metadata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target }) });
const page = { url: 'https://example.com/about?lang=en', title: 'About <Brand>', description: 'About this page', image: 'https://cdn.example.com/image.png', canonicalUrl: 'https://example.com/about', status: 'ok', cache: 'hit', stale: true, observedAt: '2026-10-09T12:00:00Z' };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('selected-page metadata proxy', () => {
  it('requests only compact exact-page metadata with server-held credentials', async () => {
    vi.stubEnv('KURKELO_URL', 'https://kurkelo.example.com'); vi.stubEnv('KURKELO_API_KEY', 'test-only-secret');
    const fetcher = vi.fn(async () => Response.json({ page, diagnostics: { secret: 'do-not-expose' }, target: { input: 'private' } })); vi.stubGlobal('fetch', fetcher);
    const response = await POST(request('https://example.com/about?lang=en#section'));
    const body = await response.json();
    expect(response.status).toBe(200); expect(body.metadata).toMatchObject({ title: page.title, description: page.description, image: page.image, stale: true, cache: 'hit' });
    expect(JSON.stringify(body)).not.toContain('do-not-expose'); expect(body).not.toHaveProperty('target');
    const [endpoint, options] = fetcher.mock.calls[0];
    expect(endpoint.href).toBe('https://kurkelo.example.com/api/discover');
    expect(options.headers.authorization).toBe('Bearer test-only-secret');
    expect(JSON.parse(options.body)).toEqual({ target: page.url, include: ['metadata'], detail: 'compact' });
    expect(options.redirect).toBe('error'); expect(options.cache).toBe('no-store');
    expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-request-id')).toBe(body.requestId);
  });
  it.each(['http://127.0.0.1/', 'http://[::1]/', 'http://2130706433/', 'https://user:secret@example.com/', 'https://host.local/', 'https://example.com:8443/', 'javascript:alert(1)', 'example.com'])('rejects unsupported targets before contacting Kurkelo: %s', async target => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect((await POST(request(target))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it('enforces the existing shared quota before inspecting input', async () => {
    const error = new SitemapError('rate_limited', 'Please wait.', 429); error.retryAfter = 60;
    enforceApiQuota.mockRejectedValueOnce(error);
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await POST(request('https://example.com/'));
    expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('60'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('preserves collector blocking and bounded retry guidance without private messages', async () => {
    vi.stubEnv('KURKELO_URL', 'https://kurkelo.example.com');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ page: { status: 'blocked', error: { code: 'domain_rate_limited', message: 'private URL detail', retryAfterSeconds: 10 } } })));
    const response = await POST(request('https://example.com/'));
    const body = await response.json(); expect(response.status).toBe(200);
    expect(body.metadata).toMatchObject({ status: 'blocked', errorCode: 'domain_rate_limited', retryAfterSeconds: 10, title: null });
    expect(JSON.stringify(body)).not.toContain('private URL detail');
  });
  it('preserves service 429 separately from a blocked collector', async () => {
    vi.stubEnv('KURKELO_URL', 'https://kurkelo.example.com');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 429, headers: { 'retry-after': '99999' } })));
    const response = await POST(request('https://example.com/'));
    expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('3600'); expect((await response.json()).code).toBe('metadata_rate_limited');
  });
  it('bounds bodies, service responses and error exposure', async () => {
    vi.stubEnv('KURKELO_URL', 'https://kurkelo.example.com');
    const fetcher = vi.fn(async () => new Response('x'.repeat(300000))); vi.stubGlobal('fetch', fetcher);
    expect((await POST(request('x'.repeat(5000)))).status).toBe(413); expect(fetcher).not.toHaveBeenCalled();
    const response = await POST(request('https://example.com/')); expect(response.status).toBe(413); expect((await response.json()).code).toBe('metadata_response_limit');
    fetcher.mockResolvedValueOnce(Response.json({ error: 'private diagnostic' }, { status: 401 }));
    expect(JSON.stringify(await (await POST(request('https://example.com/'))).json())).not.toContain('private diagnostic');
  });
  it('handles missing configuration and malformed reports', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('KURKELO_URL', '');
    expect((await POST(request('https://example.com/'))).status).toBe(503);
    vi.stubEnv('KURKELO_URL', 'https://kurkelo.example.com'); vi.stubGlobal('fetch', vi.fn(async () => Response.json({ page: { status: 'made-up' } })));
    expect((await POST(request('https://example.com/'))).status).toBe(502);
  });
  it('returns successful empty observations and rejects unsafe image/link values', async () => {
    vi.stubEnv('KURKELO_URL', 'https://kurkelo.example.com');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ page: { status: 'ok', image: 'http://169.254.169.254/latest', canonicalUrl: 'javascript:alert(1)' } })));
    const body = await (await POST(request('https://example.com/'))).json();
    expect(body.metadata).toMatchObject({ status: 'ok', title: null, description: null, image: null, canonicalUrl: null });
  });
});
