import { XMLParser } from 'fast-xml-parser';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createSitemapFetcher, sitemapLocation } from './sitemapNetwork';
import { assertGraphBudget, SitemapError, SITEMAP_LIMITS, limitError } from './sitemapLimits';

export function developmentFixture(value) {
  if (process.env.NODE_ENV !== 'development') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/sitemap-review.xml' && !url.search && !url.username && !url.password;
  } catch { return false; }
}

// Bound structure before the synchronous parser allocates nested objects.
// Quotes, comments and CDATA can contain > or fake tags; skip those explicitly.
export function assertXmlBudget(xml, limits) {
  let cursor = 0, depth = 0, elements = 0;
  while ((cursor = xml.indexOf('<', cursor)) !== -1) {
    const suffix = xml.startsWith('<!--', cursor) ? '-->' : xml.startsWith('<![CDATA[', cursor) ? ']]>' : xml.startsWith('<?', cursor) ? '?>' : null;
    if (suffix) {
      const end = xml.indexOf(suffix, cursor + 2);
      if (end === -1) throw new SitemapError('invalid_xml', 'This document is not valid sitemap XML.');
      cursor = end + suffix.length; continue;
    }
    let end = cursor + 1, quote = null;
    for (; end < xml.length; end++) {
      const char = xml[end];
      if (quote) { if (char === quote) quote = null; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === xml.length) throw new SitemapError('invalid_xml', 'This document is not valid sitemap XML.');
    const tag = xml.slice(cursor + 1, end).trim();
    if (tag.startsWith('/')) depth--;
    else if (!tag.startsWith('!')) {
      elements++;
      if (!tag.endsWith('/')) depth++;
      if (depth > limits.xmlDepth) throw limitError('xml_depth_limit', 'This XML document is too deeply nested to load.');
      if (elements > limits.xmlElements) throw limitError('xml_element_limit', 'This XML document contains too many elements to load.');
    }
    cursor = end + 1;
  }
}

export class ValidatedSitemapper {
  constructor({ signal, fetchDocument = createSitemapFetcher(), limits = {} } = {}) {
    this.signal = signal;
    this.fetchDocument = fetchDocument;
    this.limits = { ...SITEMAP_LIMITS, ...limits };
  }

  async fetch(value) {
    const limits = this.limits;
    const startedAt = performance.now();
    const controller = new AbortController();
    const signals = [controller.signal, AbortSignal.timeout(limits.timeoutMs)];
    if (this.signal) signals.push(this.signal);
    const signal = AbortSignal.any(signals);
    const checkDeadline = () => {
      signal.throwIfAborted();
      if (performance.now() - startedAt >= limits.timeoutMs) throw new SitemapError('timeout', 'Loading this sitemap took too long. Try a smaller sitemap.', 504);
    };
    const rootFixture = developmentFixture(value);
    const root = rootFixture ? value : sitemapLocation(value).href;
    const queue = [{ url: root, depth: 0 }], visited = new Set([root]);
    const sites = new Set(), errors = [], candidates = new Set();
    let wireBytes = 0, decodedBytes = 0, skippedPages = 0, fatal;
    const account = kind => bytes => {
      if (kind === 'wire') wireBytes += bytes; else decodedBytes += bytes;
      if ((kind === 'wire' ? wireBytes : decodedBytes) > limits.totalBytes) throw limitError('total_byte_limit', 'This sitemap index exceeds the 20 MiB total download or decompression budget. Choose an individual child sitemap.');
    };
    const load = async job => {
      try {
        checkDeadline();
        const documentSignal = AbortSignal.any([signal, AbortSignal.timeout(limits.documentTimeoutMs)]);
        let document;
        if (job.url === root && rootFixture) {
          const buffer = await readFile(join(process.cwd(), 'public/sitemap-review.xml'), { signal: documentSignal });
          if (buffer.length > limits.fileBytes) throw limitError('file_byte_limit', 'The example sitemap exceeds the file limit.');
          account('decoded')(buffer.length);
          document = { buffer, finalUrl: root };
        } else document = await this.fetchDocument(job.url, { signal: documentSignal, limits, onWireBytes: account('wire'), onDecodedBytes: account('decoded') });
        checkDeadline();
        const xml = document.buffer.toString('utf8');
        if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new SitemapError('invalid_xml', 'Unsupported sitemap XML declarations.');
        assertXmlBudget(xml, limits);
        const parser = new XMLParser({ removeNSPrefix: true, parseTagValue: false, isArray: name => ['sitemap', 'url'].includes(name) });
        let data;
        try { data = parser.parse(xml, true); } catch { throw new SitemapError('invalid_xml', 'This document is not valid sitemap XML.'); }
        const roots = Object.keys(data).filter(name => !name.startsWith('?'));
        if (roots.length !== 1 || !['urlset', 'sitemapindex'].includes(roots[0])) throw new SitemapError('invalid_xml', 'This document is not sitemap XML.');
        checkDeadline();
        return { job, data };
      } catch (error) {
        if (error.status === 413) { fatal ||= error; controller.abort(error); }
        return { job, error };
      }
    };
    try {
      while (queue.length) {
        checkDeadline();
        // One scheduler across all nested indexes; results are processed in source order.
        const results = await Promise.all(queue.splice(0, limits.concurrency).map(load));
        if (fatal) throw fatal;
        checkDeadline();
        for (const { job, data, error } of results) {
          if (error) {
            const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
            const failure = error instanceof SitemapError ? error : new SitemapError(timedOut ? 'timeout' : 'upstream_failed', 'This sitemap file could not be loaded. Try again later.', timedOut ? 504 : 422);
            if (job.depth === 0) throw failure;
            errors.push({ code: failure.code, message: failure.message });
            continue;
          }
          if (data.sitemapindex) {
            for (const entry of data.sitemapindex.sitemap || []) {
              let url;
              try { url = sitemapLocation(entry.loc).href; }
              catch { if (errors.length < limits.documents) errors.push({ code: 'blocked_destination', message: 'An invalid or unsafe child sitemap was skipped.' }); continue; }
              if (url !== root && candidates.size < limits.documents) candidates.add(url);
              if (visited.has(url)) continue;
              if (job.depth >= limits.indexDepth) throw limitError('index_depth_limit', 'This sitemap index is too deeply nested. Choose an individual child sitemap.');
              if (visited.size >= limits.documents) throw limitError('document_limit', 'This sitemap index contains too many files. Choose an individual child sitemap.');
              visited.add(url);
              queue.push({ url, depth: job.depth + 1 });
            }
          } else {
            for (const entry of data.urlset?.url || []) {
              if (typeof entry.loc !== 'string') { skippedPages++; continue; }
              let page;
              try {
                page = new URL(entry.loc);
                if (!['http:', 'https:'].includes(page.protocol) || page.username || page.password) throw new Error();
              } catch { skippedPages++; continue; }
              if (page.href.length > limits.urlLength) throw limitError('url_limit', 'This sitemap contains a page URL that is too long to display.');
              sites.add(page.href);
              if (sites.size > limits.pages) throw limitError('page_limit', `This sitemap has more than ${limits.pages.toLocaleString('en')} pages. Choose an individual child sitemap.`);
            }
          }
        }
      }
      const pages = [...sites];
      assertGraphBudget(pages, limits);
      checkDeadline();
      return { url: root, sites: pages, errors, warnings: skippedPages ? [`${skippedPages} invalid page URLs were skipped.`] : [] };
    } catch (error) {
      controller.abort(error);
      const failure = error instanceof SitemapError ? error : new SitemapError('timeout', 'Loading this sitemap took too long or was cancelled. Try a smaller sitemap.', 504);
      failure.candidates = [...candidates];
      throw failure;
    }
  }
}
