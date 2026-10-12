import { metadataUrl, metadataFields, retrySeconds } from './pageMetadata';

// One bounded memory cache per open map. Exact paths/queries stay distinct.
export function createMetadataClient({ fetcher = (...args) => fetch(...args), now = Date.now, maxEntries = 100, ttlMs = 300000 } = {}) {
  const cache = new Map(), flights = new Map();
  const put = (target, result, expires) => {
    cache.delete(target); cache.set(target, { result, expires });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  };
  const peek = target => {
    const entry = cache.get(target);
    if (!entry || entry.expires <= now()) return null;
    cache.delete(target); cache.set(target, entry);
    return entry.result;
  };
  async function request(target, signal) {
    const previous = cache.get(target)?.result.metadata;
    let response;
    try {
      response = await fetcher('/api/metadata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target }), signal, cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(typeof payload.error === 'string' ? payload.error : 'The page preview could not be loaded.');
        error.retryAfter = retrySeconds(response.headers.get('retry-after')); throw error;
      }
      const metadata = metadataFields({ ...payload.metadata, error: payload.metadata?.errorCode ? { code: payload.metadata.errorCode, retryAfterSeconds: payload.metadata.retryAfterSeconds } : undefined });
      const failed = ['blocked', 'failed'].includes(metadata.status);
      const retryAt = failed ? now() + (metadata.retryAfterSeconds || 30) * 1000 : null;
      const earlier = failed && previous && (previous.title || previous.description || previous.image);
      const result = { metadata: earlier ? { ...previous, stale: true } : metadata, retryAt,
        ...(earlier ? { error: 'A fresh preview is unavailable right now.' } : {}) };
      signal.throwIfAborted();
      put(target, result, retryAt || now() + ttlMs);
      return result;
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      const retryAt = now() + (error.retryAfter || 30) * 1000;
      const result = { error: error.message || 'The page preview could not be loaded.', retryAt, ...(previous ? { metadata: { ...previous, stale: true } } : {}) };
      put(target, result, retryAt);
      return result;
    }
  }
  function load(value, signal) {
    const target = metadataUrl(value);
    if (!target) return Promise.resolve({ error: 'Page previews are unavailable for this URL.', retryAt: null });
    if (signal?.aborted) return Promise.reject(signal.reason);
    const cached = peek(target);
    if (cached) return Promise.resolve(cached);
    let entry = flights.get(target);
    if (!entry) {
      entry = { controller: new AbortController(), users: new Set() };
      flights.set(target, entry);
      entry.promise = request(target, entry.controller.signal).finally(() => { if (flights.get(target) === entry) flights.delete(target); });
    }
    return new Promise((resolve, reject) => {
      const user = {};
      entry.users.add(user);
      const release = () => { entry.users.delete(user); signal?.removeEventListener('abort', cancel); };
      const cancel = () => {
        release(); reject(signal.reason);
        if (!entry.users.size) { entry.controller.abort(); if (flights.get(target) === entry) flights.delete(target); }
      };
      signal?.addEventListener('abort', cancel, { once: true });
      entry.promise.then(result => { release(); resolve(result); }, error => { release(); reject(error); });
    });
  }
  return { peek, load, dispose() { for (const entry of flights.values()) entry.controller.abort(); flights.clear(); cache.clear(); } };
}
