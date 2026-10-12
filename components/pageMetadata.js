import ipaddr from 'ipaddr.js';

// Publisher-provided links are observations, not permission to fetch privately.
// No server image proxy is introduced; preview images are hotlinked in the browser.
export function metadataUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value), host = url.hostname.replace(/^\[|\]$/g, '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || ipaddr.isValid(host)
      || !host.includes('.') || host.endsWith('.') || /\.(?:localhost|local|internal|test|example|invalid|onion)$/.test(host)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

const text = (value, limit) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, limit) || null : null;
export const retrySeconds = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.min(3600, Math.ceil(Number(value))) : null;

export function metadataFields(page) {
  if (!page || !['ok', 'partial', 'blocked', 'failed'].includes(page.status)) throw new Error('Invalid metadata response');
  const observed = typeof page.observedAt === 'string' ? Date.parse(page.observedAt) : NaN;
  return {
    status: page.status, observedAt: Number.isFinite(observed) ? new Date(observed).toISOString() : null,
    cache: ['hit', 'miss', 'stale', 'bypass'].includes(page.cache) ? page.cache : null,
    stale: page.stale === true,
    title: text(page.title, 2000), description: text(page.description, 5000),
    image: metadataUrl(page.image), url: metadataUrl(page.url), canonicalUrl: metadataUrl(page.canonicalUrl),
    errorCode: typeof page.error?.code === 'string' && /^[a-z\d_]{1,80}$/i.test(page.error.code) ? page.error.code : null,
    retryAfterSeconds: retrySeconds(page.error?.retryAfterSeconds),
  };
}
