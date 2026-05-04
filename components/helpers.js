// Estimate pixel width of a label string at ~0.72rem Inter font
export function estimateLabelWidth(label) {
	if (!label) return 90;
	return Math.ceil(label.length * 6.2 + 20);
}

export const cyrb53 = (str, seed = 0) => {
	let h1 = 0xdeadbeef ^ seed,
		h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 =
		Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
		Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 =
		Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
		Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export const makeTree = function (sitemap) {
	// Derive base path from actual page URLs, not the sitemap XML URL itself
	// (they can differ, e.g. sitemap served from localhost but pages on the real domain)
	const firstSite = sitemap.sites?.[0];
	const referenceUrl = new URL(firstSite || sitemap.url);
	const siteBasePath = `${referenceUrl.protocol}//${referenceUrl.hostname}`;
	const pathSplits = {};
	var edgeNode = 0;

	sitemap.sites.forEach((item) => {
		const fullPath = item.replace(siteBasePath, '').replace(/\/$/, '') || '/';

		// Display only the last path segment, not the full path
		const segments = fullPath.split('/').filter((s) => s !== '');
		const label = segments.length > 0 ? segments[segments.length - 1] : 'Home';

		const node = {
			id: `n${cyrb53(item)}`,
			url: item,
			data: { label, fullPath, subpages: 0 },
			position: { x: 0, y: 0 },
		};

		const splitUrl = item
			.replace(siteBasePath, '')
			.replace(/\/$/, '')
			.split('/');

		let workingObj = pathSplits;
		splitUrl.forEach((path) => {
			if (!workingObj[path]) {
				edgeNode += 1;
				workingObj[path] = {
					__self: {
						id: `en${cyrb53(`edgenode-${edgeNode}`)}`,
						data: { label: path || referenceUrl.hostname, fullPath: path, subpages: 0 },
						position: { x: 0, y: 0 },
					},
				};
			}
			workingObj = workingObj[path];
		});

		workingObj['__self'] = node;
	});

	return pathSplits;
};

// Returns flat node array with depth annotated on data.depth.
// Initial depth -1 so the root URL at pathSplits['']['__self'] gets depth 0.
export const getSubSitemap = (xs, parent, depth = -1) => {
	var acc = [];

	if (xs.__self) {
		acc.push({
			...xs.__self,
			data: { ...xs.__self.data, depth },
		});
	}

	Object.keys(xs).forEach((key) => {
		if (key !== '__self') {
			acc.push(...getSubSitemap(xs[key], xs.__self ?? null, depth + 1));
		}
	});

	return acc;
};

export const getSubEdgemap = (xs, parent) => {
	var acc = [];
	const current = xs.__self ? xs.__self : false;

	if (current && parent) {
		acc.push({
			id: `edge-${parent.id}-${current.id}`,
			source: `${parent.id}`,
			target: `${current.id}`,
			type: 'smoothstep',
		});
	}

	Object.keys(xs).forEach((key) => {
		if (key !== '__self') {
			acc.push(...getSubEdgemap(xs[key], current));
		}
	});

	return acc;
};

export const makeInitialData = (data) => {
	const rawnodes = makeTree(data);
	const nodes = getSubSitemap(rawnodes);
	const edges = getSubEdgemap(rawnodes, false);
	return { initialNodes: nodes, initialEdges: edges };
};

// ---------- flatness heuristic ----------

export function detectAlgorithm(nodes) {
	if (!nodes || nodes.length === 0) return 'groups';
	// Always use the compound group layout — it handles all site shapes well
	return 'groups';
}

// ---------- compound group layout ----------
// Section nodes become bordered container boxes.
// Leaf/descendant nodes have parentNode: sectionId and are positioned in a
// grid using local coordinates inside the container.
// Only root → section edges are drawn; containment replaces section→leaf edges.

const DIM_G = {
	rootW: 200, rootH: 48,
	cardW: 150, cardH: 32,
	hGap: 10,   vGap: 8,
	headerH: 40,
	padX: 14,
	padTop: 10,
	padBottom: 14,
	sectionGap: 28,
	rootToSections: 64,
	maxCols: 6,
};

export function computeGroupLayout(nodes, edges) {
	const childrenMap = new Map();
	edges.forEach((e) => {
		if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
		childrenMap.get(e.source).push(e.target);
	});
	const nodeById = new Map(nodes.map((n) => [n.id, n]));

	function getAllDescendants(nodeId) {
		const kids = childrenMap.get(nodeId) ?? [];
		return kids.flatMap((kidId) => {
			const kid = nodeById.get(kidId);
			return kid ? [kid, ...getAllDescendants(kidId)] : [];
		});
	}

	const root = nodes.find((n) => n.data.depth === 0) ?? null;
	const sections = nodes.filter((n) => n.data.depth === 1);
	const resultNodes = [];
	const resultEdges = [];
	const includedIds = new Set();

	const sectionsY = root ? DIM_G.rootH + DIM_G.rootToSections : 0;
	let curX = 0;

	sections.forEach((section) => {
		const descendants = getAllDescendants(section.id);
		const n = descendants.length;

		// Dynamic card width: fit the longest descendant label
		const maxDescW = descendants.length > 0
			? Math.max(...descendants.map((d) => estimateLabelWidth(d.data?.label || '')))
			: DIM_G.cardW;
		const cardW = Math.max(DIM_G.cardW, Math.min(220, maxDescW));

		// Grid shape: fill column-first, cap at maxCols
		const cols = n === 0 ? 1 : Math.min(DIM_G.maxCols, Math.ceil(Math.sqrt(n)));
		const rows = n === 0 ? 0 : Math.ceil(n / cols);

		const innerW = cols * cardW + Math.max(0, cols - 1) * DIM_G.hGap;
		const innerH = rows * DIM_G.cardH + Math.max(0, rows - 1) * DIM_G.vGap;

		// Ensure container is wide enough for its own header label too
		const headerMinW = estimateLabelWidth(section.data?.label || '') + 24;
		const containerW = Math.max(DIM_G.padX * 2 + innerW, headerMinW);
		const containerH =
			DIM_G.headerH + DIM_G.padTop + innerH + DIM_G.padBottom;

		// Section container node
		resultNodes.push({
			...section,
			type: 'sectionGroup',
			className: 'node-section-group',
			position: { x: curX, y: sectionsY },
			width: containerW,
			height: containerH,
			style: { width: containerW, height: containerH },
			sourcePosition: 'bottom',
			targetPosition: 'top',
		});
		includedIds.add(section.id);

		// Leaf / descendant nodes — local coords inside container
		descendants.forEach((child, i) => {
			const col = Math.floor(i / rows);
			const row = i % rows;
			const localX = DIM_G.padX + col * (cardW + DIM_G.hGap);
			const localY =
				DIM_G.headerH + DIM_G.padTop + row * (DIM_G.cardH + DIM_G.vGap);
			resultNodes.push({
				...child,
				type: 'default',
				className: 'node-leaf',
				parentNode: section.id,
				extent: 'parent',
				position: { x: localX, y: localY },
				width: cardW,
				height: DIM_G.cardH,
				style: { width: cardW, height: DIM_G.cardH },
				sourcePosition: 'bottom',
				targetPosition: 'top',
			});
			includedIds.add(child.id);
		});

		// Edge: root → section
		if (root) {
			resultEdges.push({
				id: `ge-${root.id}-${section.id}`,
				source: root.id,
				target: section.id,
				type: 'smoothstep',
			});
		}

		curX += containerW + DIM_G.sectionGap;
	});

	// Root node — centered above all sections
	const totalW = curX > 0 ? curX - DIM_G.sectionGap : DIM_G.rootW;
	if (root) {
		const rootW = Math.max(DIM_G.rootW, Math.min(300, estimateLabelWidth(root.data?.label || '')));
		resultNodes.unshift({
			...root,
			type: 'default',
			className: 'node-root',
			position: { x: Math.max(0, (totalW - rootW) / 2), y: 0 },
			width: rootW,
			height: DIM_G.rootH,
			style: { width: rootW, height: DIM_G.rootH },
			sourcePosition: 'bottom',
			targetPosition: 'top',
		});
		includedIds.add(root.id);
	}

	// Orphan fallback: any node not yet placed
	nodes.forEach((n) => {
		if (!includedIds.has(n.id)) {
			resultNodes.push({
				...n,
				type: 'default',
				className: 'node-leaf',
				position: { x: 0, y: -80 },
				width: DIM_G.cardW,
				height: DIM_G.cardH,
				style: { width: DIM_G.cardW, height: DIM_G.cardH },
			});
		}
	});

	return { nodes: resultNodes, edges: resultEdges };
}

// ---------- section-grid layout ----------
// Groups leaf pages under their section headers.
// Each section's descendants are arranged in wrapped columns.
// Sections are placed side by side horizontally.

const DIM = {
	rootW: 200, rootH: 48,
	sectionW: 172, sectionH: 40,
	cardW: 160, cardH: 34,
	hGap: 12,    // gap between cards horizontally
	vGap: 8,     // gap between cards vertically
	groupGap: 32, // gap between section groups
	rootToSections: 56,
	sectionToCards: 20,
	maxRowsPerCol: 14,
};

export function computeSectionLayout(nodes, edges) {
	// Build parent → children map
	const childrenMap = new Map();
	edges.forEach((e) => {
		if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
		childrenMap.get(e.source).push(e.target);
	});
	const nodeById = new Map(nodes.map((n) => [n.id, n]));

	function getAllDescendants(nodeId) {
		const kids = childrenMap.get(nodeId) ?? [];
		return kids.flatMap((kidId) => {
			const kid = nodeById.get(kidId);
			return kid ? [kid, ...getAllDescendants(kidId)] : [];
		});
	}

	const root = nodes.find((n) => n.data.depth === 0) ?? null;
	const sections = nodes.filter((n) => n.data.depth === 1);
	const positioned = new Map(); // nodeId → {x, y, w, h}

	const sectionsY = root ? DIM.rootH + DIM.rootToSections : 0;
	let curX = 0;

	sections.forEach((section) => {
		const descendants = getAllDescendants(section.id);
		const n = descendants.length;

		// Dynamic card width based on longest descendant label
		const maxDescW = descendants.length > 0
			? Math.max(...descendants.map((d) => estimateLabelWidth(d.data?.label || '')))
			: DIM.cardW;
		const cardW = Math.max(DIM.cardW, Math.min(240, maxDescW));
		const sectionNodeW = Math.max(DIM.sectionW, Math.min(240, estimateLabelWidth(section.data?.label || '')));

		// Determine grid shape
		const rowsPerCol =
			n <= 5
				? n
				: Math.min(DIM.maxRowsPerCol, Math.ceil(Math.sqrt(n * 1.4)));
		const numCols = n > 0 ? Math.ceil(n / rowsPerCol) : 0;
		const gridW =
			numCols > 0 ? numCols * (cardW + DIM.hGap) - DIM.hGap : 0;

		const groupW = Math.max(sectionNodeW, gridW);

		// Section header — centered over the grid
		positioned.set(section.id, {
			x: curX + (groupW - sectionNodeW) / 2,
			y: sectionsY,
			w: sectionNodeW,
			h: DIM.sectionH,
		});

		// Children
		const childrenStartY = sectionsY + DIM.sectionH + DIM.sectionToCards;
		descendants.forEach((child, i) => {
			const col = Math.floor(i / rowsPerCol);
			const row = i % rowsPerCol;
			positioned.set(child.id, {
				x: curX + col * (cardW + DIM.hGap),
				y: childrenStartY + row * (DIM.cardH + DIM.vGap),
				w: cardW,
				h: DIM.cardH,
			});
		});

		curX += groupW + DIM.groupGap;
	});

	// Root — centered above all sections
	const totalW = curX > 0 ? curX - DIM.groupGap : DIM.rootW;
	if (root) {
		const rootW = Math.max(DIM.rootW, Math.min(300, estimateLabelWidth(root.data?.label || '')));
		positioned.set(root.id, {
			x: Math.max(0, (totalW - rootW) / 2),
			y: 0,
			w: rootW,
			h: DIM.rootH,
		});
	}

	// Fall back: any unpositioned depth-1 nodes (leaf sections, no children)
	const unpositioned = nodes.filter(
		(n) => n.data.depth === 1 && !positioned.has(n.id)
	);
	if (unpositioned.length > 0) {
		unpositioned.forEach((n, i) => {
			positioned.set(n.id, {
				x: i * (DIM.sectionW + DIM.hGap),
				y: sectionsY,
				w: DIM.sectionW,
				h: DIM.sectionH,
			});
		});
	}

	// Any remaining nodes (orphans, deep edge-nodes, etc.)
	nodes.forEach((n) => {
		if (!positioned.has(n.id)) {
			positioned.set(n.id, { x: 0, y: -60, w: DIM.cardW, h: DIM.cardH });
		}
	});

	return nodes.map((n) => {
		const pos = positioned.get(n.id);
		const depth = n.data?.depth ?? 1;
		const className =
			depth === 0 ? 'node-root' : depth === 1 ? 'node-section' : 'node-leaf';

		return {
			...n,
			className,
			position: { x: pos.x, y: pos.y },
			width: pos.w,
			height: pos.h,
			style: { ...n.style, width: pos.w, height: pos.h },
			sourcePosition: 'bottom',
			targetPosition: 'top',
		};
	});
}
