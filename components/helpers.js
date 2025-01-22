import dagre from 'dagre';
import { initialEdges, initialNodes } from './exampleNodes';

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

	let url = new URL(sitemap.url);

	// const siteBasePath = sitemap.url.replace('/page-sitemap.xml', '');
	const siteBasePath = `${url.protocol}//${url.hostname}`;
	const pathSplits = {};

	var edgeNode = 0;

	sitemap.sites.forEach((item, i) => {
		const label = item.replace(siteBasePath, "").replace(/\/$/, "");
		const node = {
			id: `n${cyrb53(item)}`,
			url: item,
			data: { label: label == "" ? "Home" : label, subpages: 0 },
			position: {
				x: 0,
				y: 0,
			},
		};

		if (label == "") {
			node.style = {
				backgroundColor: '#000',
				color: 'white'
			}
		}

		//split the url into an array of strings
		const splitUrl = item
			.replace(siteBasePath, '')
			.replace(/\/$/, '')
			.split('/');
		let workingObj = pathSplits;

		//handle each part of the path one by one
		splitUrl.forEach((path, index) => {
			//create the nested object if it doesn't exist
			if (!workingObj[path]) {
				edgeNode += 1;
				console.log('DO WE EVER GET HERE?');
				workingObj[path] = {
					__self: {
						id: `en${cyrb53(`edgenode-${edgeNode}`)}`,
						data: { label: path, subpages: 0 },
						position: {
							x: 0,
							y: 0,
						},
					},
				};
			}

			// Increment the subpages counter
			// workingObj[path].__self.data.subpages += 1;
			// console.log(path);

			// Check if subpages exceed 10 and apply different style
			if (workingObj[path].__self.data.subpages > 4) {
				// node.style = {
				// 	background: "teal", // Red background
				// 	color: "#000",
				// };
			}
			//update the working object reference
			workingObj = workingObj[path];
		});

		workingObj['__self'] = node;
		// workingObj['__self'] = item;
	});
	return pathSplits;
};

export const getSubSitemap = (xs, parent) => {
	var acc = [];

	const current = xs.__self ? xs.__self : false;
	if (current) acc.push(xs.__self);
	const keys = Object.keys(xs);
	if (Array.isArray(keys)) {
		keys.forEach((i, v) => {
			if (i !== '__self') {
				acc.push(...getSubSitemap(xs[i], current));
			}
		});
	}

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
			animated: true,
		});
	}
	const keys = Object.keys(xs);
	if (Array.isArray(keys)) {
		keys.forEach((i, v) => {
			if (i !== '__self') {
				acc.push(...getSubEdgemap(xs[i], current));
			}
		});
	}

	return acc;
};

/*
export const makeNodesAndEdges = (sitemap) => {
	const siteBasePath = sitemap.url.replace('page-sitemap.xml', '');
	const pathSplits = {};

	// console.log(sitemap);
	var edgeNode = 0;
	const nodes = [];
	const edges = [];
	const edgenodes = [];

	sitemap.sites.forEach((item, i) => {
		const node = {
			id: item,
			url: item,
			type: 'input',
			data: { label: item },
			x: 0,
			y: 0,
		};

		//split the url into an array of strings
		const splitUrl = item
			.replace(siteBasePath, '')
			.replace(/\/$/, '')
			.split('/');
		let workingObj = pathSplits;

		//handle each part of the path one by one
		splitUrl.forEach((path, index) => {
			//create the nested object if it doesn't exist
			if (!workingObj[path]) {
				edgeNode += 1;
				let edge = {
					id: `edgenode${edgeNode}`,
					type: 'input',
					data: { label: path },
					x: 0,
					y: 0,
				};
				workingObj[path] = { __self: edge };
				edgenodes.push(edge);

				edges.push({
					id: `e${edgeNode}`,
					source: item,
					target: `edgenode${edgeNode}`,
					type: 'smoothstep',
					animated: true,
				});
			}
			//update the working object reference
			workingObj = workingObj[path];
		});

		workingObj['__self'] = node;
		nodes.push(node);
		// workingObj['__self'] = item;
	});
	return { nodes: [...nodes, ...edgenodes], edges };
};
*/

export const getLayoutedElements = (nodes, edges, direction) => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	const nodeWidth = 172;
	const nodeHeight = 36;

	const isHorizontal = direction === 'LR';
	dagreGraph.setGraph({ rankdir: direction });

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	nodes.forEach((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		node.targetPosition = isHorizontal ? 'left' : 'top';
		node.sourcePosition = isHorizontal ? 'right' : 'bottom';

		// We are shifting the dagre node position (anchor=center center) to the top left
		// so it matches the React Flow node anchor point (top left).
		node.position = {
			x: nodeWithPosition.x - nodeWidth / 2,
			y: nodeWithPosition.y - nodeHeight / 2,
		};

		return node;
	});

	return { nodes, edges };
};

export const makeInitialData = (data) => {

	// data.sites = data.sites.slice(0, 3);
	const rawnodes = makeTree(data);

	const nodes = getSubSitemap(rawnodes, '');
	const edges = getSubEdgemap(rawnodes, false);

	// const nodes = initialNodes;
	// const edges = initialEdges;
	return { initialNodes: nodes, initialEdges: edges };
};
