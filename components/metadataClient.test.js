import { describe, expect, it, vi } from 'vitest';
import { createMetadataClient } from './metadataClient';
const target = 'https://example.com/about';
const result = title => Response.json({ metadata: { status: 'ok', title, description: null, image: null, url: target } });

describe('metadata request reuse', () => {
  it('does nothing until a page is requested, deduplicates concurrent reads and reuses results', async () => {
    let finish;
    const fetcher = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const client = createMetadataClient({ fetcher }); expect(fetcher).not.toHaveBeenCalled();
    const a = client.load(target), b = client.load(target); expect(fetcher).toHaveBeenCalledTimes(1);
    finish(result('About'));
    expect((await a).metadata.title).toBe('About'); expect(await b).toEqual(await a);
    expect(await client.load(target)).toEqual(await a); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('keeps query values distinct and strips only fragments', async () => {
    const fetcher = vi.fn(async () => result('About'));
    const client = createMetadataClient({ fetcher });
    await client.load(`${target}?lang=en#one`); await client.load(`${target}?lang=en#two`); await client.load(`${target}?lang=fi`);
    expect(fetcher).toHaveBeenCalledTimes(2); expect(JSON.parse(fetcher.mock.calls[0][1].body).target).toBe(`${target}?lang=en`);
  });
  it('bounds cached entries and expires successful results', async () => {
    let time = 0; const fetcher = vi.fn(async () => result('About'));
    const client = createMetadataClient({ fetcher, now: () => time, ttlMs: 100, maxEntries: 2 });
    await client.load(`${target}/a`); await client.load(`${target}/b`); await client.load(`${target}/c`);
    expect(client.peek(`${target}/a`)).toBeNull();
    time = 101; await client.load(`${target}/c`); expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('cancels unused requests without cancelling another subscriber', async () => {
    let finish; const fetcher = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const client = createMetadataClient({ fetcher }); const a = new AbortController(), b = new AbortController();
    const first = client.load(target, a.signal), second = client.load(target, b.signal);
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' }); a.abort(); await rejected;
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(false);
    finish(result('About')); expect((await second).metadata.title).toBe('About');
    const c = new AbortController(); const last = client.load(`${target}/other`, c.signal);
    const lastRejected = expect(last).rejects.toMatchObject({ name: 'AbortError' }); c.abort(); await lastRejected;
    expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true); finish(result('Late result'));
    await Promise.resolve(); expect(client.peek(`${target}/other`)).toBeNull();
  });
  it('honors retry cooldowns and retains an earlier preview on failed refresh', async () => {
    let time = 0; const fetcher = vi.fn(async () => result('Earlier title'));
    const client = createMetadataClient({ fetcher, now: () => time, ttlMs: 100 });
    await client.load(target); time = 101;
    fetcher.mockResolvedValueOnce(Response.json({ error: 'Please wait.' }, { status: 429, headers: { 'retry-after': '10' } }));
    const failed = await client.load(target); expect(failed).toMatchObject({ error: 'Please wait.', retryAt: 10101, metadata: { title: 'Earlier title', stale: true } });
    await client.load(target); expect(fetcher).toHaveBeenCalledTimes(2);
    time = 10102; expect((await client.load(target)).metadata.title).toBe('Earlier title'); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('backs off collector throttling and clears memory when the map closes', async () => {
    const fetcher = vi.fn(async () => Response.json({ metadata: { status: 'blocked', errorCode: 'domain_rate_limited', retryAfterSeconds: 60 } }));
    const client = createMetadataClient({ fetcher, now: () => 100 });
    expect((await client.load(target)).retryAt).toBe(60100); await client.load(target); expect(fetcher).toHaveBeenCalledTimes(1);
    client.dispose(); expect(client.peek(target)).toBeNull();
  });
  it('retains successful evidence when a collector refresh is blocked', async () => {
    let time = 0;
    const fetcher = vi.fn(async () => result('Earlier title'));
    const client = createMetadataClient({ fetcher, now: () => time, ttlMs: 100 });
    await client.load(target); time = 101;
    fetcher.mockResolvedValueOnce(Response.json({ metadata: { status: 'blocked', errorCode: 'domain_rate_limited', retryAfterSeconds: 60 } }));
    expect(await client.load(target)).toMatchObject({ metadata: { title: 'Earlier title', stale: true }, error: 'A fresh preview is unavailable right now.', retryAt: 60101 });
  });
  it('does not fetch unsupported URLs', async () => {
    const fetcher = vi.fn(); const client = createMetadataClient({ fetcher });
    expect((await client.load('http://localhost/')).error).toBeDefined(); expect(fetcher).not.toHaveBeenCalled();
  });
});
