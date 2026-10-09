import { NextResponse } from 'next/server';
import { normalizeSiteInput } from '../../../components/sitemapInput';
import { apiError, boundedText } from '../../../components/serverResponses';
import { SitemapError, SITEMAP_LIMITS } from '../../../components/sitemapLimits';
import { enforceApiQuota } from '../../../components/apiQuota';

export const runtime = 'nodejs';
export const maxDuration = 40;

export async function POST(request) {
  const requestId = crypto.randomUUID();
  try { await enforceApiQuota(request); } catch (error) { return apiError(error, requestId); }
  let target;
  try {
    if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) throw new SitemapError('unsupported_media_type', 'Use a JSON request.', 415);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
    const text = await boundedText(request.body, request.headers, 4096, signal);
    target = normalizeSiteInput(JSON.parse(text).target);
    if (target.length > SITEMAP_LIMITS.urlLength) throw new SitemapError('invalid_input', 'This website URL is too long.', 400);
  } catch (error) {
    return apiError(error instanceof SitemapError ? error : new SitemapError('invalid_input', 'Enter a valid website URL in a JSON request.', 400), requestId);
  }
  const baseUrl = process.env.KURKELO_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : null);
  if (!baseUrl) {
    return apiError(new SitemapError('discovery_unconfigured', 'Website discovery is unavailable right now. You can still paste a sitemap XML URL.', 503), requestId);
  }
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30000)]);
    const response = await fetch(new URL('/api/discover', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(process.env.KURKELO_API_KEY ? { authorization: `Bearer ${process.env.KURKELO_API_KEY}` } : {}) },
      body: JSON.stringify({ target, include: ['sitemaps'], detail: 'compact' }),
      signal,
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) {
        const error = new SitemapError('discovery_rate_limited', 'Website discovery is busy. Please wait before trying again.', 429);
        const retry = Number(response.headers.get('retry-after'));
        error.retryAfter = Number.isFinite(retry) && retry > 0 ? Math.min(3600, Math.ceil(retry)) : 60;
        throw error;
      }
      throw new Error('Discovery service failed');
    }
    const report = JSON.parse(await boundedText(response.body, response.headers, 256 * 1024, signal, 'discovery_response_limit'));
    const discovery = report.site?.status?.sitemaps;
    if (!discovery) throw new Error('Invalid discovery response');
    const values = report.site.sitemaps || [];
    if (!Array.isArray(values) || values.length > SITEMAP_LIMITS.documents) throw new SitemapError('discovery_location_limit', 'Too many sitemap locations were returned. Try a sitemap XML URL.', 422);
    const locations = [...new Set(values.map(value => {
      const url = normalizeSiteInput(value);
      if (url.length > SITEMAP_LIMITS.urlLength) throw new Error('Invalid location');
      return url;
    }))];
    return NextResponse.json({ locations, discovery }, { headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError';
    return apiError(error instanceof SitemapError ? error : new SitemapError(timedOut ? 'timeout' : 'discovery_failed', timedOut ? 'Finding the sitemap took too long. Try again or paste a sitemap XML URL.' : 'Website discovery is unavailable right now. Try again or paste a sitemap XML URL.', timedOut ? 504 : 502), requestId);
  }
}
