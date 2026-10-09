import { SITEMAP_LIMITS } from './sitemapLimits';

export function normalizeSiteInput(value) {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input || input.length > SITEMAP_LIMITS.urlLength || /\s/.test(input)) throw new Error('Enter a domain or website URL of at most 2048 characters, like example.com.');
  let url;
  try {
    url = new URL(input.startsWith('//') ? `https:${input}` : /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
  } catch {
    throw new Error('Enter a valid domain or website URL, like example.com.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (!url.hostname.includes('.') && url.hostname !== 'localhost') || url.hostname.endsWith('.')) {
    throw new Error('Enter a valid HTTP or HTTPS website URL.');
  }
  url.hash = '';
  return url.href;
}

export function isSitemapUrl(url) {
  return /(?:\.xml(?:\.gz)?|\/sitemap(?:_index)?\/?|\.gz)$/i.test(new URL(url).pathname);
}

export const encodeSitemapUrl = value => btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const decodeSitemapUrl = value => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0)));

// A sitemap must contain usable page locations before it can become a graph.
export function validateSitemapData(data) {
  if (!Array.isArray(data?.sites) || data.sites.length === 0) {
    throw new Error('This sitemap has no pages to display. Try another sitemap URL.');
  }
  let skippedPages = 0;
  const sites = data.sites.flatMap(value => {
    try {
      if (typeof value !== 'string') throw new Error();
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
      return [url.href];
    } catch {
      skippedPages += 1;
      return [];
    }
  });
  if (!sites.length) throw new Error('This sitemap has no valid page URLs to display. Try another sitemap URL.');
  const failedSitemaps = Array.isArray(data.errors) ? data.errors.length : 0;
  // Preserve warnings when a verified response is validated again in the client.
  const warnings = [...new Set([...(data.warnings || []),
    ...(failedSitemaps ? [`${failedSitemaps} sitemap ${failedSitemaps === 1 ? 'file could' : 'files could'} not be loaded. This map may be incomplete.`] : []),
    ...(skippedPages ? [`${skippedPages} invalid page ${skippedPages === 1 ? 'URL was' : 'URLs were'} skipped.`] : []),
  ])];
  return { ...data, sites: [...new Set(sites)], warnings };
}
