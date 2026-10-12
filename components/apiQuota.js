import { checkRateLimit } from '@vercel/firewall';
import { SitemapError } from './sitemapLimits';

// One shared bucket for discovery, sitemap loading and selected-page metadata.
// No caller-selected host or arbitrary headers reach the Firewall API.
export async function enforceApiQuota(request, check = checkRateLimit) {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') return;
  const host = process.env.VERCEL_URL;
  const ip = request.headers.get('x-real-ip');
  if (process.env.VERCEL !== '1' || !host || !/^[a-z\d.-]+\.vercel\.app$/i.test(host) || !ip) {
    throw new SitemapError('quota_unconfigured', 'The sitemap service is not ready for public requests. Please try again later.', 503);
  }
  let result;
  try {
    result = await check('shitemap-api', { headers: new Headers({ host, 'x-real-ip': ip, 'x-forwarded-for': ip }), timeout: 1000 });
  } catch {
    throw new SitemapError('quota_unavailable', 'Request limits could not be checked. Please try again shortly.', 503);
  }
  if (result.error === 'not-found' || typeof result.rateLimited !== 'boolean') throw new SitemapError('quota_unconfigured', 'The sitemap service is not ready for public requests. Please try again later.', 503);
  if (result.rateLimited) {
    const error = new SitemapError('rate_limited', 'Too many sitemap requests. Please wait a minute before trying again.', 429);
    error.retryAfter = 60;
    throw error;
  }
}
