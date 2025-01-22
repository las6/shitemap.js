'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
	MiniMap,
	Controls,
	ConnectionLineType,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
	useReactFlow,
} from 'reactflow';
import "reactflow/dist/style.css";
import './Modal.css'; // Import custom modal styles
import './NodeDetails.css'; // Import custom node details styles
import { getLayoutedElements } from '../components/helpers';

export const Flow = ({data, site}) => {

	const [nodes, setNodes, onNodesChange] = useNodesState(
		data.layoutedNodes
	);
	const [edges, setEdges, onEdgesChange] = useEdgesState(
		data.layoutedEdges
	);
	const [selectedNode, setSelectedNode] = useState(null);
	const [direction, setDirection] = useState(site.layout ?? 'LR');
	const [open, setOpen] = useState(false);
	const [hiddenNodes, setHiddenNodes] = useState([]);
	const baseUrl = site.url;
	const reactFlowInstance = useReactFlow();

	const handleHashChange = () => {
		const hash = window.location.hash.substring(1);
		if (hash) {
			const node = nodes.find((n) => n.id === hash);
			if (node) {
				reactFlowInstance.fitView({ nodes: [node], padding: 0.3, maxZoom: 1.25 });
				setSelectedNode(node);
				setOpen(true);
			} else {
				console.log('no node?')
			}
		}
	};

	useEffect(() => {
		setNodes(data.layoutedNodes);
		setEdges(data.layoutedEdges);
		handleHashChange();
	}, [data]);
	
	useEffect(() => {		

		window.addEventListener('hashchange', handleHashChange);
		// handleHashChange(); // Trigger on initial load

		return () => {
			window.removeEventListener('hashchange', handleHashChange);
		};
	}, [nodes, reactFlowInstance]);
	
	useEffect(() => {
		handleHashChange();
	}, [data, reactFlowInstance]);

	const onConnect = useCallback(
		(params) =>
			setEdges((eds) =>
				addEdge(
					{ ...params, type: ConnectionLineType.SmoothStep, animated: true },
					eds
				)
			),
		[]
	);
	
	const onLayout = useCallback(
		(direction) => {
			const { nodes: layoutedNodes, edges: layoutedEdges } =
				getLayoutedElements(nodes, edges, direction);

			setNodes([...layoutedNodes]);
			setEdges([...layoutedEdges]);
		},
		[nodes, edges]
	);

	useEffect(() => {
		onLayout(direction);
	}, [direction]);

	const onEdgeUpdate = useCallback(
		(oldEdge, newConnection) =>
			setEdges((els) => updateEdge(oldEdge, newConnection, els)),
		[]
	);

	const handleNodeClick = (event, node) => {
		setSelectedNode(node);
		setOpen(true);
		history.replaceState(null, null, `#${node.id}`);
	};

	const handleClose = () => {
		setOpen(false);
		setSelectedNode(null);
		history.replaceState(null, null, ``);
	};

	const toggleChildrenVisibility = () => {
		if (selectedNode) {
			const toggleVisibility = (nodeId) => {
				const children = edges.filter(edge => edge.source === nodeId).map(edge => edge.target);
				setHiddenNodes(prevHiddenNodes => {
					const newHiddenNodes = [...prevHiddenNodes];
					children.forEach(childId => {
						const index = newHiddenNodes.indexOf(childId);
						if (index > -1) {
							newHiddenNodes.splice(index, 1);
						} else {
							newHiddenNodes.push(childId);
						}
						toggleVisibility(childId); // Recursively toggle visibility for children
					});
					return newHiddenNodes;
				});
			};
			toggleVisibility(selectedNode.id);
			onLayout(direction); // Trigger relayout after toggling
		}
	};

	const isNodeHidden = (nodeId) => {
		if (hiddenNodes.includes(nodeId)) {
			return true;
		}
		const parentEdge = edges.find(edge => edge.target === nodeId);
		if (parentEdge) {
			return isNodeHidden(parentEdge.source);
		}
		return false;
	};

	const filteredNodes = nodes.filter(node => !isNodeHidden(node.id));
	const filteredEdges = edges.filter(edge => !isNodeHidden(edge.source) && !isNodeHidden(edge.target));

	return (
		<div className="layoutflow">
			<div className="controls">
				<button className={ direction == 'TB' ? 'active' : ''} onClick={() => setDirection("TB")}>Top-down</button>
				<button className={direction == 'LR' ? 'active' : ''}  onClick={() => setDirection("LR")}>Left-to-Right</button>
			</div>
			<ReactFlow
				nodes={filteredNodes}
				edges={filteredEdges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodesConnectable={false}
				nodesDraggable={false}
				onConnect={onConnect}
				onEdgeUpdate={onEdgeUpdate}
				onNodeClick={handleNodeClick}
				connectionLineType={ConnectionLineType.SmoothStep}
				proOptions={{ hideAttribution: false }}
				snapToGrid
				fitView
				maxZoom={2}
				minZoom={0.01}
			>
				<MiniMap />
				<Controls />
				<Background />
			</ReactFlow>
			{open && (
				<div className="node-details">
					<span className="close" onClick={handleClose}>
						&times;
					</span>
					<div className="node-details-content">
						<h2>Node Details</h2>

						{selectedNode && (
							<a
								href={`${baseUrl}${selectedNode.data.label}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<span className="material-symbols-sharp">open_in_new</span>{' '}
								{`${selectedNode.data.label}`}
							</a>
						)}
						<button onClick={handleHashChange}>Center view</button>
						<button onClick={toggleChildrenVisibility}>Toggle Children Visibility</button>
					</div>
				</div>
			)}
		</div>
	);
};