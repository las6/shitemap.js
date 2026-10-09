import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createSitemapFetcher, publicAddress, publicDestination, requestPinned, sitemapLocation } from './sitemapNetwork';

describe('public destination enforcement', () => {
  it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '172.16.0.1', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2002:7f00:1::'])('blocks special/private address %s', value => expect(publicAddress(value)).toBe(false));
  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('permits public address %s', value => expect(publicAddress(value)).toBe(true));
  it.each(['file:///etc/passwd', 'http://user:secret@example.com/', 'http://localhost/', 'http://example.local/', 'http://example.com:8080/', 'http://2130706433/', 'http://[::ffff:127.0.0.1]/'])('rejects unsafe URL before DNS: %s', value => expect(() => sitemapLocation(value)).toThrow());
  it('blocks a host with mixed public/private DNS results', async () => {
    const resolve = vi.fn(async () => [{ address: '8.8.8.8', family: 4 }, { address: '::1', family: 6 }]);
    await expect(publicDestination(new URL('https://example.com/'), null, resolve)).rejects.toMatchObject({ code: 'blocked_destination' });
  });
  it('pins the connection lookup and keeps hostname/TLS verification intact', async () => {
    const requester = vi.fn((url, options, callback) => {
      expect(url.hostname).toBe('example.com');
      expect(options.rejectUnauthorized).toBe(true);
      expect(options.agent).toBe(false);
      options.lookup('example.com', {}, (error, address, family) => {
        expect(error).toBeNull(); expect(address).toBe('8.8.8.8'); expect(family).toBe(4);
      });
      options.lookup('example.com', { all: true }, (error, addresses) => {
        expect(error).toBeNull(); expect(addresses).toEqual([{ address: '8.8.8.8', family: 4 }]);
      });
      const request = new EventEmitter();
      request.end = () => callback('connected');
      return request;
    });
    expect(await requestPinned(new URL('https://example.com/'), { address: '8.8.8.8', family: 4 }, undefined, requester)).toBe('connected');
  });
  it('rejects a redirect to a private DNS destination without connecting there', async () => {
    const resolver = vi.fn(async host => [{ address: host === 'example.com' ? '8.8.8.8' : '10.0.0.1', family: 4 }]);
    const transport = vi.fn(async () => {
      const stream = Readable.from([]);
      stream.statusCode = 302; stream.headers = { location: 'https://private.example.com/sitemap.xml' };
      return stream;
    });
    await expect(createSitemapFetcher({ resolver, transport })('https://example.com/sitemap.xml')).rejects.toMatchObject({ code: 'blocked_destination' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('rechecks DNS at every redirect hop, including the same hostname', async () => {
    const resolver = vi.fn().mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }]).mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    const transport = vi.fn(async () => {
      const stream = Readable.from([]); stream.statusCode = 302; stream.headers = { location: '/next.xml' }; return stream;
    });
    await expect(createSitemapFetcher({ resolver, transport })('https://example.com/sitemap.xml')).rejects.toMatchObject({ code: 'blocked_destination' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledTimes(2);
  });
  it('bounds a hanging DNS lookup by the caller signal', async () => {
    await expect(publicDestination(new URL('https://example.com/'), AbortSignal.timeout(5), () => new Promise(() => {}))).rejects.toMatchObject({ name: 'TimeoutError' });
  });
  it('rejects an oversized Content-Length without consuming the body', async () => {
    const stream = Readable.from([Buffer.from('xml')]); stream.statusCode = 200; stream.headers = { 'content-length': '999' };
    const transport = async () => stream;
    await expect(createSitemapFetcher({ resolver: async () => [{ address: '8.8.8.8', family: 4 }], transport })('https://example.com/sitemap.xml', { limits: { fileBytes: 10, redirects: 3 } })).rejects.toMatchObject({ code: 'file_byte_limit' });
    expect(stream.destroyed).toBe(true);
  });
});
