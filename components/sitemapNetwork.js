import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';
import ipaddr from 'ipaddr.js';
import { SitemapError, SITEMAP_LIMITS, limitError } from './sitemapLimits';

export function publicAddress(value) {
  try { return ipaddr.process(value).range() === 'unicast'; } catch { return false; }
}

export function sitemapLocation(value) {
  if (typeof value !== 'string' || value.length > SITEMAP_LIMITS.urlLength) throw new SitemapError('invalid_url', 'Supply an HTTP or HTTPS sitemap URL of at most 2048 characters.', 400);
  let url;
  try { url = new URL(value); } catch { throw new SitemapError('invalid_url', 'This sitemap location is not a valid URL.', 400); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || /[\u0000-\u0020\u007f\\]/.test(value)) {
    throw new SitemapError('blocked_destination', 'Sitemaps must use HTTP or HTTPS on a standard port, without credentials.');
  }
  if (host === 'localhost' || !host.includes('.') && !ipaddr.isValid(host) || /\.(?:localhost|local|internal|test|invalid|onion)$/.test(host) || host.endsWith('.')) {
    throw new SitemapError('blocked_destination', 'Local and private sitemap destinations are not supported.');
  }
  if (ipaddr.isValid(host) && !publicAddress(host)) throw new SitemapError('blocked_destination', 'Local and private sitemap destinations are not supported.');
  url.hash = '';
  return url;
}

export async function publicDestination(url, signal, resolver = lookup) {
  url = sitemapLocation(url.href);
  signal?.throwIfAborted();
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(host)) return { address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 };
  let stop;
  const aborted = new Promise((_, reject) => {
    stop = () => reject(signal.reason);
    signal?.addEventListener('abort', stop, { once: true });
  });
  try {
    const addresses = await Promise.race([resolver(host, { all: true, verbatim: true }), aborted]);
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new SitemapError('blocked_destination', 'This sitemap host does not resolve exclusively to public addresses.');
    // Prefer IPv4 where available. The actual connection uses this exact address.
    return addresses.find(value => value.family === 4) || addresses[0];
  } finally { signal?.removeEventListener('abort', stop); }
}

export function pinnedLookup(destination) {
  return (_hostname, options, callback) => {
    if (typeof options === 'function') { callback = options; options = {}; }
    if (options?.all) callback(null, [destination]);
    else callback(null, destination.address, destination.family);
  };
}

// Never re-resolve between validation and connection, reuse an unrelated socket,
// or follow redirects implicitly. URL hostname remains intact for Host and TLS.
export function requestPinned(url, destination, signal, requester = url.protocol === 'https:' ? httpsRequest : httpRequest) {
  return new Promise((resolve, reject) => {
    const request = requester(url, {
      method: 'GET', agent: false, lookup: pinnedLookup(destination),
      rejectUnauthorized: true, signal, maxHeaderSize: 16384,
      headers: { accept: 'application/xml, text/xml, */*', 'accept-encoding': 'gzip, deflate, br', 'user-agent': 'Shitemap/0.3 sitemap explorer' },
    }, resolve);
    request.once('error', reject);
    request.end();
  });
}

export async function readBytes(stream, maxBytes, signal, onBytes = () => {}) {
  const chunks = [];
  let size = 0;
  const abort = () => stream.destroy(signal.reason);
  try {
    signal?.throwIfAborted();
    signal?.addEventListener('abort', abort, { once: true });
    for await (const chunk of stream) {
      signal?.throwIfAborted();
      size += chunk.length;
      if (size > maxBytes) throw limitError('file_byte_limit', 'This sitemap file exceeds the 10 MiB download or decompression limit. Try a smaller sitemap.');
      onBytes(chunk.length);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, size);
  } finally {
    signal?.removeEventListener('abort', abort);
    stream.destroy();
  }
}

async function decompress(buffer, decoder, maxBytes, signal) {
  const source = Readable.from([buffer]);
  source.pipe(decoder);
  try { return await readBytes(decoder, maxBytes, signal); }
  finally { source.destroy(); decoder.destroy(); }
}

export function createSitemapFetcher({ resolver = lookup, transport = requestPinned } = {}) {
  return async (value, { signal, limits = SITEMAP_LIMITS, onWireBytes, onDecodedBytes } = {}) => {
    let url = sitemapLocation(value);
    for (let hop = 0; hop <= limits.redirects; hop++) {
      const destination = await publicDestination(url, signal, resolver);
      const response = await transport(url, destination, signal);
      const status = response.statusCode;
      if ([301, 302, 303, 307, 308].includes(status)) {
        const location = response.headers.location;
        response.destroy();
        if (!location || hop === limits.redirects) throw new SitemapError('redirect_limit', 'This sitemap redirected too many times.');
        const next = sitemapLocation(new URL(location, url).href);
        if (url.protocol === 'https:' && next.protocol === 'http:') throw new SitemapError('blocked_destination', 'A sitemap redirected from HTTPS to insecure HTTP.');
        url = next;
        continue;
      }
      if (status < 200 || status >= 300) { response.destroy(); throw new SitemapError('upstream_http', `The sitemap server returned HTTP ${status}. Try another sitemap or try again later.`); }
      if (Number(response.headers['content-length']) > limits.fileBytes) { response.destroy(); throw limitError('file_byte_limit', 'This sitemap file exceeds the 10 MiB download limit. Try a smaller sitemap.'); }
      let buffer = await readBytes(response, limits.fileBytes, signal, onWireBytes);
      const encoding = response.headers['content-encoding']?.toLowerCase();
      const decoders = { gzip: createGunzip, deflate: createInflate, br: createBrotliDecompress };
      if (encoding && encoding !== 'identity') {
        if (!Object.hasOwn(decoders, encoding)) throw new SitemapError('unsupported_encoding', 'This sitemap uses an unsupported compression format.');
        buffer = await decompress(buffer, decoders[encoding](), limits.fileBytes, signal);
      }
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = await decompress(buffer, createGunzip(), limits.fileBytes, signal);
      onDecodedBytes?.(buffer.length);
      return { buffer, finalUrl: url.href };
    }
  };
}
