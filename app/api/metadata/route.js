import { NextResponse } from 'next/server';
import { enforceApiQuota } from '../../../components/apiQuota';
import { SitemapError } from '../../../components/sitemapLimits';
import { apiError, boundedText } from '../../../components/serverResponses';
import { metadataUrl, metadataFields, retrySeconds } from '../../../components/pageMetadata';

export const runtime = 'nodejs';
export const maxDuration = 40;

export async function POST(request) {
  const requestId = crypto.randomUUID();
  try {
    await enforceApiQuota(request);
    if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) throw new SitemapError('unsupported_media_type', 'Use a JSON request.', 415);
    const inputSignal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
    let target;
    try { target = metadataUrl(JSON.parse(await boundedText(request.body, request.headers, 4096, inputSignal)).target); }
    catch (error) { if (error instanceof SitemapError) throw error; }
    if (!target) throw new SitemapError('invalid_target', 'Page previews require a public HTTP or HTTPS page URL.', 400);
    const baseUrl = process.env.KURKELO_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : null);
    if (!baseUrl) throw new SitemapError('metadata_unconfigured', 'Page previews are unavailable right now.', 503);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30000)]);
    const response = await fetch(new URL('/api/discover', baseUrl), {
      method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.KURKELO_API_KEY ? { authorization: `Bearer ${process.env.KURKELO_API_KEY}` } : {}) },
      body: JSON.stringify({ target, include: ['metadata'], detail: 'compact' }),
      signal, redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) {
        const error = new SitemapError('metadata_rate_limited', 'Page previews are busy. Please wait before trying again.', 429);
        error.retryAfter = retrySeconds(response.headers.get('retry-after')) || 60;
        throw error;
      }
      throw new Error('Metadata service failed');
    }
    const report = JSON.parse(await boundedText(response.body, response.headers, 256 * 1024, signal, 'metadata_response_limit'));
    return NextResponse.json({ metadata: metadataFields(report.page), requestId }, { headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError';
    return apiError(error instanceof SitemapError ? error : new SitemapError(timedOut ? 'timeout' : 'metadata_failed', timedOut ? 'Loading the page preview took too long. Try again.' : 'The page preview could not be loaded. Try again later.', timedOut ? 504 : 502), requestId);
  }
}
