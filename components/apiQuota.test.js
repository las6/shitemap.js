import { afterEach, describe, expect, it, vi } from 'vitest';
import { enforceApiQuota } from './apiQuota';

const request = new Request('https://attacker.example/api/sitemapper', { headers: { host: 'attacker.example', 'x-real-ip': '1.2.3.4', authorization: 'secret', cookie: 'private' } });
function production() {
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('VERCEL', '1'); vi.stubEnv('VERCEL_URL', 'shitemap-build.vercel.app');
}
afterEach(() => vi.unstubAllEnvs());
describe('shared API quota guard', () => {
  it('bypasses external quota work only in development/test', async () => {
    const check = vi.fn(); vi.stubEnv('NODE_ENV', 'development');
    await enforceApiQuota(request, check); expect(check).not.toHaveBeenCalled();
  });
  it('uses a trusted deployment host and platform IP without forwarding secrets', async () => {
    production(); const check = vi.fn(async () => ({ rateLimited: false }));
    await enforceApiQuota(request, check);
    const [id, options] = check.mock.calls[0];
    expect(id).toBe('shitemap-api'); expect(options.timeout).toBe(1000);
    expect(Object.fromEntries(options.headers)).toEqual({ host: 'shitemap-build.vercel.app', 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '1.2.3.4' });
  });
  it('returns a stable throttling error', async () => {
    production(); await expect(enforceApiQuota(request, async () => ({ rateLimited: true }))).rejects.toMatchObject({ code: 'rate_limited', status: 429, retryAfter: 60 });
  });
  it('fails closed when the rule is missing or its service fails', async () => {
    production();
    await expect(enforceApiQuota(request, async () => ({ rateLimited: false, error: 'not-found' }))).rejects.toMatchObject({ code: 'quota_unconfigured', status: 503 });
    await expect(enforceApiQuota(request, async () => { throw new Error('internal credential'); })).rejects.toMatchObject({ code: 'quota_unavailable', status: 503 });
  });
  it('refuses production on an unsupported host without trusting request headers', async () => {
    production(); vi.stubEnv('VERCEL', ''); const check = vi.fn();
    await expect(enforceApiQuota(request, check)).rejects.toMatchObject({ code: 'quota_unconfigured' }); expect(check).not.toHaveBeenCalled();
  });
});
