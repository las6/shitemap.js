import { describe, it, expect } from 'vitest';
import {
	cyrb53,
	estimateLabelWidth,
	makeTree,
	makeInitialData,
	detectAlgorithm,
} from './helpers.js';

// --- cyrb53 ---

describe('cyrb53', () => {
	it('returns a number', () => {
		expect(typeof cyrb53('hello')).toBe('number');
	});

	it('is deterministic', () => {
		expect(cyrb53('foo')).toBe(cyrb53('foo'));
	});

	it('produces different hashes for different inputs', () => {
		expect(cyrb53('foo')).not.toBe(cyrb53('bar'));
	});

	it('seed changes the output', () => {
		expect(cyrb53('foo', 0)).not.toBe(cyrb53('foo', 1));
	});
});

// --- estimateLabelWidth ---

describe('estimateLabelWidth', () => {
	it('returns 90 for empty/null input', () => {
		expect(estimateLabelWidth('')).toBe(90);
		expect(estimateLabelWidth(null)).toBe(90);
		expect(estimateLabelWidth(undefined)).toBe(90);
	});

	it('returns a larger value for a longer label', () => {
		expect(estimateLabelWidth('short')).toBeLessThan(estimateLabelWidth('a much longer label'));
	});

	it('returns a positive number', () => {
		expect(estimateLabelWidth('hello')).toBeGreaterThan(0);
	});
});

// --- makeTree ---

const fakeSitemap = {
	url: 'https://example.com/sitemap.xml',
	sites: [
		'https://example.com/',
		'https://example.com/about',
		'https://example.com/blog',
		'https://example.com/blog/post-1',
		'https://example.com/blog/post-2',
	],
};

describe('makeTree', () => {
  it('treats prototype and metadata-like path segments as ordinary pages', () => {
    const result = makeInitialData({ sites: ['https://example.com/', 'https://example.com/__proto__/constructor', 'https://example.com/__self/child'] });
    expect(result.initialNodes.filter(node => node.url)).toHaveLength(3);
    expect(result.initialNodes.some(node => node.data.label === '__self')).toBe(true);
    expect({}.data).toBeUndefined();
  });
	it('returns an object', () => {
		expect(typeof makeTree(fakeSitemap)).toBe('object');
	});

	it('contains entries for each path segment', () => {
		const tree = makeTree(fakeSitemap);
		expect(tree).toHaveProperty('');
		expect(tree['']).toHaveProperty('blog');
	});

	it('nests blog posts under blog', () => {
		const tree = makeTree(fakeSitemap);
		expect(tree[''].blog).toHaveProperty('post-1');
		expect(tree[''].blog).toHaveProperty('post-2');
	});
});

// --- makeInitialData ---

describe('makeInitialData', () => {
	it('returns initialNodes and initialEdges arrays', () => {
		const { initialNodes, initialEdges } = makeInitialData(fakeSitemap);
		expect(Array.isArray(initialNodes)).toBe(true);
		expect(Array.isArray(initialEdges)).toBe(true);
	});

	it('creates one node per unique URL', () => {
		const { initialNodes } = makeInitialData(fakeSitemap);
		expect(initialNodes.length).toBe(fakeSitemap.sites.length);
	});

	it('gives the root node depth 0', () => {
		const { initialNodes } = makeInitialData(fakeSitemap);
		const root = initialNodes.find((n) => n.data.depth === 0);
		expect(root).toBeDefined();
	});

	it('gives leaf nodes a positive depth', () => {
		const { initialNodes } = makeInitialData(fakeSitemap);
		const leaves = initialNodes.filter((n) => n.data.depth > 0);
		expect(leaves.length).toBeGreaterThan(0);
	});

	it('creates edges connecting nodes', () => {
		const { initialEdges } = makeInitialData(fakeSitemap);
		expect(initialEdges.length).toBeGreaterThan(0);
		initialEdges.forEach((e) => {
			expect(e).toHaveProperty('source');
			expect(e).toHaveProperty('target');
		});
	});

	it('node ids are stable (same input → same ids)', () => {
		const { initialNodes: a } = makeInitialData(fakeSitemap);
		const { initialNodes: b } = makeInitialData(fakeSitemap);
		expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
	});
});

// --- detectAlgorithm ---

describe('detectAlgorithm', () => {
	it('returns "groups" for a non-empty node list', () => {
		expect(detectAlgorithm([{ id: '1' }])).toBe('groups');
	});

	it('returns "groups" for an empty array', () => {
		expect(detectAlgorithm([])).toBe('groups');
	});

	it('returns "groups" for null/undefined', () => {
		expect(detectAlgorithm(null)).toBe('groups');
		expect(detectAlgorithm(undefined)).toBe('groups');
	});
});
