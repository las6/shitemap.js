import { NextResponse } from 'next/server';
import { SitemapError } from './sitemapLimits';

export function apiError(error, requestId) {
  const safe = error instanceof SitemapError ? error : new SitemapError('service_failed', 'The sitemap service could not finish this request. Try again.', 502);
  return NextResponse.json({ error: safe.message, code: safe.code, requestId, ...(safe.candidates?.length ? { candidates: safe.candidates } : {}) }, {
    status: safe.status,
    headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId, ...(safe.retryAfter ? { 'Retry-After': String(safe.retryAfter) } : {}) },
  });
}

export async function boundedText(body, headers, limit, signal, limitCode = 'request_byte_limit') {
  if (Number(headers.get('content-length')) > limit) { await body?.cancel(); throw new SitemapError(limitCode, 'This request or response is too large.', 413); }
  const reader = body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  const abort = () => reader.cancel().catch(() => {});
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new SitemapError(limitCode, 'This request or response is too large.', 413);
      chunks.push(value);
    }
    return Buffer.concat(chunks, size).toString('utf8');
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
  }
}
