'use client';

import ELK from 'elkjs/lib/elk.bundled.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
	MiniMap,
	Controls,
	ConnectionLineType,
	Background,
	BackgroundVariant,
	useNodesState,
	useEdgesState,
	addEdge,
	useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './Modal.css';
import './NodeDetails.css';
import SectionGroupNode from './SectionGroupNode';
import {
	detectAlgorithm,
	computeGroupLayout,
	computeSectionLayout,
} from '../components/helpers';

// Stable nodeTypes object — must not be recreated on every render
const nodeTypes = { sectionGroup: SectionGroupNode };

const elk = new ELK();

function getNodeDimensions(depth) {
	if (depth === 0) return { width: 200, height: 48 };
	if (depth === 1) return { width: 172, height: 40 };
	return { width: 160, height: 34 };
}

async function runELKLayout(nodes, edges, algorithm) {
	const elkChildren = nodes.map((n) => ({
		id: n.id,
		...getNodeDimensions(n.data?.depth ?? 1),
	}));

	const elkEdges = edges.map((e) => ({
		id: e.id,
		sources: [e.source],
		targets: [e.target],
	}));

	let layoutOptions;
	if (algorithm === 'radial') {
		layoutOptions = {
			'elk.algorithm': 'radial',
			'elk.spacing.nodeNode': '30',
			'elk.radial.compactionStepSize': '5',
		};
	} else if (algorithm === 'layered-tb') {
		layoutOptions = {
			'elk.algorithm': 'layered',
			'elk.direction': 'DOWN',
			'elk.layered.wrapping.strategy': 'MULTI_EDGE',
			'elk.aspectRatio': '1.6',
			'elk.spacing.nodeNode': '18',
			'elk.layered.spacing.nodeNodeBetweenLayers': '50',
		};
	} else {
		// layered-lr
		layoutOptions = {
			'elk.algorithm': 'layered',
			'elk.direction': 'RIGHT',
			'elk.layered.wrapping.strategy': 'MULTI_EDGE',
			'elk.aspectRatio': '1.6',
			'elk.spacing.nodeNode': '18',
			'elk.layered.spacing.nodeNodeBetweenLayers': '50',
		};
	}

	const graph = { id: 'root', layoutOptions, children: elkChildren, edges: elkEdges };
	const layouted = await elk.layout(graph);
	const isLR = algorithm === 'layered-lr';

	return nodes.map((n) => {
		const elkNode = layouted.children.find((c) => c.id === n.id);
		const dims = getNodeDimensions(n.data?.depth ?? 1);
		const depth = n.data?.depth ?? 1;
		const className =
			depth === 0 ? 'node-root' : depth === 1 ? 'node-section' : 'node-leaf';
		return {
			...n,
			className,
			position: { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 },
			targetPosition: isLR ? 'left' : 'top',
			sourcePosition: isLR ? 'right' : 'bottom',
			width: dims.width,
			height: dims.height,
			style: { ...n.style, width: dims.width, height: dims.height },
		};
	});
}

const ALGORITHMS = [
	{ id: 'groups', label: '⊞ Groups' },
	{ id: 'sections', label: '⊟ Flat' },
	{ id: 'layered-lr', label: '→ Layered' },
	{ id: 'layered-tb', label: '↓ Layered' },
	{ id: 'radial', label: '◎ Radial' },
];

export const Flow = ({ rawNodes, rawEdges, site }) => {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [algorithm, setAlgorithm] = useState(null);
	const [layouting, setLayouting] = useState(false);
	const [selectedNode, setSelectedNode] = useState(null);
	const [open, setOpen] = useState(false);
	const [hiddenNodes, setHiddenNodes] = useState([]);
	const [iframeUrl, setIframeUrl] = useState(null);
	const [iframeOpen, setIframeOpen] = useState(false);
	const autoDetectedRef = useRef(false);
	const needsFitViewRef = useRef(false);
	const reactFlowInstance = useReactFlow();

	// Auto-detect once when nodes first arrive
	useEffect(() => {
		if (rawNodes?.length > 0 && !autoDetectedRef.current) {
			autoDetectedRef.current = true;
			setAlgorithm(detectAlgorithm(rawNodes));
		}
	}, [rawNodes]);

	// Run layout whenever nodes or algorithm changes
	useEffect(() => {
		if (!rawNodes || !rawEdges || !algorithm) return;

		setLayouting(true);

		const run = async () => {
			let layoutedNodes, layoutedEdges;
			if (algorithm === 'groups') {
				const result = computeGroupLayout(rawNodes, rawEdges);
				layoutedNodes = result.nodes;
				layoutedEdges = result.edges;
			} else if (algorithm === 'sections') {
				layoutedNodes = computeSectionLayout(rawNodes, rawEdges);
				layoutedEdges = rawEdges;
			} else {
				layoutedNodes = await runELKLayout(rawNodes, rawEdges, algorithm);
				layoutedEdges = rawEdges;
			}
			setNodes(layoutedNodes);
			setEdges(layoutedEdges);
			setHiddenNodes([]);
			needsFitViewRef.current = true;
		};

		run()
			.catch((err) => console.error('Layout failed:', err))
			.finally(() => setLayouting(false));
	}, [rawNodes, rawEdges, algorithm]);

	// Fit view only after a fresh layout, not on every node state change (e.g. selection)
	useEffect(() => {
		if (!layouting && needsFitViewRef.current) {
			needsFitViewRef.current = false;
			setTimeout(() => reactFlowInstance.fitView({ padding: 0.08 }), 60);
		}
	}, [layouting]);

	const handleHashChange = useCallback(() => {
		const hash = window.location.hash.substring(1);
		if (!hash) return;
		const node = nodes.find((n) => n.id === hash);
		if (node) {
			reactFlowInstance.fitView({ nodes: [node], padding: 0.3, maxZoom: 1.25 });
			setSelectedNode(node);
			setOpen(true);
		}
	}, [nodes, reactFlowInstance]);

	useEffect(() => {
		window.addEventListener('hashchange', handleHashChange);
		return () => window.removeEventListener('hashchange', handleHashChange);
	}, [handleHashChange]);

	const onConnect = useCallback(
		(params) =>
			setEdges((eds) =>
				addEdge({ ...params, type: ConnectionLineType.SmoothStep }, eds)
			),
		[setEdges]
	);

	const handleNodeClick = (_, node) => {
		setSelectedNode(node);
		setOpen(true);
		history.replaceState(null, null, `#${node.id}`);
	};

	const handleClose = () => {
		setOpen(false);
		setSelectedNode(null);
		history.replaceState(null, null, '');
	};

	const handleBreadcrumbClick = useCallback((node) => {
		setSelectedNode(node);
		history.replaceState(null, null, `#${node.id}`);
		reactFlowInstance.fitView({ nodes: [node], padding: 0.3, maxZoom: 1.25 });
	}, [reactFlowInstance]);

	const toggleChildrenVisibility = useCallback(() => {
		if (!selectedNode) return;
		const getDescendants = (nodeId) => {
			const kids = edges.filter((e) => e.source === nodeId).map((e) => e.target);
			return kids.flatMap((kidId) => [kidId, ...getDescendants(kidId)]);
		};
		const descendants = getDescendants(selectedNode.id);
		if (descendants.length === 0) return;
		setHiddenNodes((prev) => {
			const anyHidden = descendants.some((id) => prev.includes(id));
			if (anyHidden) {
				return prev.filter((id) => !descendants.includes(id));
			} else {
				return [...prev, ...descendants.filter((id) => !prev.includes(id))];
			}
		});
	}, [selectedNode, edges]);

	const isHidden = (id) => {
		if (hiddenNodes.includes(id)) return true;
		const parent = edges.find((e) => e.target === id);
		return parent ? isHidden(parent.source) : false;
	};

	// All descendants of the selected node, mapped to their depth (1 = direct child)
	const selectedDescendantDepths = useMemo(() => {
		if (!selectedNode) return new Map();
		const map = new Map();
		const traverse = (nodeId, depth) => {
			edges
				.filter((e) => e.source === nodeId)
				.forEach((e) => {
					if (!map.has(e.target)) {
						map.set(e.target, depth);
						traverse(e.target, depth + 1);
					}
				});
		};
		traverse(selectedNode.id, 1);
		return map;
	}, [selectedNode, edges]);

	// Breadcrumb path from root to selected node
	const breadcrumbs = useMemo(() => {
		if (!selectedNode) return [];
		const nodeMap = new Map(nodes.map((n) => [n.id, n]));
		const path = [];
		let currentId = selectedNode.id;
		const visited = new Set();
		while (currentId && !visited.has(currentId)) {
			visited.add(currentId);
			const node = nodeMap.get(currentId);
			if (!node) break;
			path.unshift(node);
			// edges cover flat/ELK layouts; parentNode covers groups compound layout
			const parentEdge = edges.find((e) => e.target === currentId);
			currentId = parentEdge?.source ?? node.parentNode ?? null;
		}
		return path;
	}, [selectedNode, nodes, edges]);

	// While iframe is open, keep it in sync with the selected node's URL
	useEffect(() => {
		if (iframeOpen && selectedNode?.url) {
			setIframeUrl(selectedNode.url);
		}
	}, [selectedNode, iframeOpen]);

	// Nodes that have at least one directly hidden child (collapsed)
	const collapsedNodeIds = useMemo(() => {
		const set = new Set();
		nodes.forEach((n) => {
			const kids = edges.filter((e) => e.source === n.id).map((e) => e.target);
			if (kids.length > 0 && kids.some((kidId) => hiddenNodes.includes(kidId))) {
				set.add(n.id);
			}
		});
		return set;
	}, [nodes, edges, hiddenNodes]);

	const filteredNodes = nodes.filter((n) => !isHidden(n.id));
	const filteredEdges = edges.filter(
		(e) => !isHidden(e.source) && !isHidden(e.target)
	);

	// Augment nodes with highlight/collapsed classes without mutating layout state
	const displayNodes = filteredNodes.map((n) => {
		const classes = [n.className];
		const descendantDepth = selectedDescendantDepths.get(n.id);
		if (descendantDepth) {
			classes.push(
				descendantDepth === 1
					? 'node-selected-child-1'
					: descendantDepth === 2
					? 'node-selected-child-2'
					: 'node-selected-child-3'
			);
		}
		if (collapsedNodeIds.has(n.id)) classes.push('node-collapsed');
		const newClassName = classes.filter(Boolean).join(' ').trim();
		return newClassName !== n.className ? { ...n, className: newClassName } : n;
	});

	return (
		<div className="app-layout">
			<div className="sitemap-pane">
				<div className="layoutflow">
					<div className="controls">
						{ALGORITHMS.map((a) => (
							<button
								key={a.id}
								className={algorithm === a.id ? 'active' : ''}
								onClick={() => setAlgorithm(a.id)}
							>
								{a.label}
							</button>
						))}
					</div>
					{layouting && <div className="layout-loading">Laying out…</div>}
					<ReactFlow
						nodes={displayNodes}
						edges={filteredEdges}
						nodeTypes={nodeTypes}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						nodesConnectable={false}
						nodesDraggable={true}
						onConnect={onConnect}
						onNodeClick={handleNodeClick}
						connectionLineType={ConnectionLineType.SmoothStep}
						proOptions={{ hideAttribution: false }}
						fitView
						maxZoom={3}
						minZoom={0.01}
					>
						<MiniMap zoomable pannable />
						<Controls />
						<Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e0e0e0" />
					</ReactFlow>
				</div>
				{open && selectedNode && (
					<div className="node-details">
						<span className="close" onClick={handleClose}>&times;</span>
						<div className="node-details-content">
							<h2>{selectedNode.data.label}</h2>
							{breadcrumbs.length > 1 && (
								<div className="breadcrumbs">
									{breadcrumbs.map((n, i) => (
										<span key={n.id}>
											{i > 0 && <span className="breadcrumb-sep">›</span>}
											<span
												className={`breadcrumb-item${n.id === selectedNode.id ? ' current' : ''}`}
												onClick={() => n.id !== selectedNode.id && handleBreadcrumbClick(n)}
											>
												{n.data.label}
											</span>
										</span>
									))}
								</div>
							)}
							{selectedNode.url ? (
								<a href={selectedNode.url} target="_blank" rel="noopener noreferrer">
									<span className="material-symbols-sharp">open_in_new</span>{' '}
									{selectedNode.url}
								</a>
							) : (
								<span className="node-path">{selectedNode.data.fullPath || selectedNode.data.label}</span>
							)}
							<button onClick={handleHashChange}>Center view</button>
							<button onClick={toggleChildrenVisibility}>Toggle child pages</button>
							{selectedNode.url && (
								<button
									className={iframeOpen ? 'active' : ''}
									onClick={() => {
										setIframeUrl(selectedNode.url);
										setIframeOpen((v) => !v);
									}}
								>
									{iframeOpen ? 'Close preview' : 'Preview'}
								</button>
							)}
						</div>
					</div>
				)}
			</div>
			<div className={`iframe-pane${iframeOpen ? ' is-open' : ''}`}>
				{iframeUrl && (
					<>
						<div className="iframe-header">
							<span className="iframe-url" title={iframeUrl}>{iframeUrl}</span>
							<a href={iframeUrl} target="_blank" rel="noopener noreferrer" className="iframe-btn">
								<span className="material-symbols-sharp">open_in_new</span>
							</a>
							<button className="iframe-btn" onClick={() => setIframeOpen(false)}>
								<span className="material-symbols-sharp">close</span>
							</button>
						</div>
						<iframe src={iframeUrl} title="Page preview" />
					</>
				)}
			</div>
		</div>
	);
};
