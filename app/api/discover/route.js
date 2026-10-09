import { NextResponse } from 'next/server';
import { normalizeSiteInput } from '../../../components/sitemapInput';

export async function POST(request) {
  let target;
  try {
    target = normalizeSiteInput((await request.json()).target);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const baseUrl = process.env.KURKELO_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : null);
  if (!baseUrl) {
    return NextResponse.json({ error: 'Website discovery is unavailable right now. You can still paste a sitemap XML URL.' }, { status: 503 });
  }
  try {
    const response = await fetch(new URL('/api/discover', baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(process.env.KURKELO_API_KEY ? { authorization: `Bearer ${process.env.KURKELO_API_KEY}` } : {}) },
      body: JSON.stringify({ target, include: ['sitemaps'], detail: 'compact' }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Discovery service failed');
    const report = await response.json();
    const discovery = report.site?.status?.sitemaps;
    if (!discovery) throw new Error('Invalid discovery response');
    const locations = [...new Set((report.site.sitemaps || []).map(normalizeSiteInput))];
    return NextResponse.json({ locations, discovery }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError';
    return NextResponse.json({ error: timedOut ? 'Finding the sitemap took too long. Try again or paste a sitemap XML URL.' : 'Website discovery is unavailable right now. Try again or paste a sitemap XML URL.' }, { status: timedOut ? 504 : 502 });
  }
}
