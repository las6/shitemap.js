import Sitemapper from 'sitemapper';
import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'node:zlib';

const MAX_BYTES = 10 * 1024 * 1024;

// Keep Sitemapper's index expansion, but validate XML before its lenient parser
// could turn a malformed document into apparently usable page locations.
export class ValidatedSitemapper extends Sitemapper {
  constructor(options = {}) {
    super({ timeout: 15000, retries: 0 });
    this.signal = options.signal;
    this.visited = new Set();
    this.failures = [];
  }

  async fetch(url = this.url) {
    const result = await super.fetch(url);
    return { ...result, errors: this.failures };
  }

  async crawl(url) {
    if (this.visited.has(url)) return { sites: [], errors: [] };
    this.visited.add(url);
    const result = await super.crawl(url);
    if (!result) {
      this.failures.push({ url, message: 'This sitemap could not be parsed.' });
      return { sites: [], errors: [] };
    }
    this.failures.push(...result.errors);
    // Sitemapper discards children that have any errors. Collect failures
    // separately so ancestors can still retain pages from partial child indexes.
    return { ...result, errors: [] };
  }

  async parse(value) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid sitemap location.');
      const timeout = AbortSignal.timeout(this.timeout);
      const signal = this.signal ? AbortSignal.any([this.signal, timeout]) : timeout;
      const response = await fetch(url, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Sitemap returned HTTP ${response.status}.`);
      const reader = response.body.getReader();
      const chunks = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_BYTES) throw new Error('This sitemap file is too large to load.');
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      let buffer = Buffer.concat(chunks);
      if (buffer[0] === 0x1f && buffer[1] === 0x8b) buffer = gunzipSync(buffer, { maxOutputLength: MAX_BYTES });
      const xml = buffer.toString('utf8');
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsupported sitemap XML declarations.');
      const parser = new XMLParser({ removeNSPrefix: true, parseTagValue: false, isArray: name => ['sitemap', 'url'].includes(name) });
      const data = parser.parse(xml, true);
      const roots = Object.keys(data).filter(name => !name.startsWith('?'));
      if (roots.length !== 1 || !['urlset', 'sitemapindex'].includes(roots[0])) throw new Error('This document is not sitemap XML.');
      return { error: null, data };
    } catch (error) {
      return { error: error.message, data: { name: error.name } };
    }
  }
}
