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
	const [direction, setDirection] = useState('LR');
	const [open, setOpen] = useState(false);
	const baseUrl = site.url;
	const reactFlowInstance = useReactFlow();

	useEffect(() => {
		setNodes(data.layoutedNodes);
		setEdges(data.layoutedEdges);
	}, [data]);

	useEffect(() => {
		const handleHashChange = () => {
			const hash = window.location.hash.substring(1);
			if (hash) {
				const node = nodes.find(n => n.id === hash);
				if (node) {
					const { x, y } = node.position;
					// reactFlowInstance.zoomTo(12.5, { x, y });
					reactFlowInstance.fitView({ nodes: [node], padding: 0.33, maxZoom: 1 });
					setSelectedNode(node);
					setOpen(true);
				}
			}
		};

		window.addEventListener('hashchange', handleHashChange);
		handleHashChange(); // Trigger on initial load

		return () => {
			window.removeEventListener('hashchange', handleHashChange);
		};
	}, [nodes, reactFlowInstance]);

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
		console.log('direction', direction);
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
		// window.location.hash = node.id; // Update the URL with the node ID as a hash fragment
		history.pushState(null, null, `#${node.id}`);
	};

	const handleClose = () => {
		setOpen(false);
		setSelectedNode(null);
		// window.location.hash = ''; // Clear the hash fragment from the URL
		history.pushState(null, null, ``);
	};

	// const handleZoomToNode = () => {
	// 	if (selectedNode) {
	// 		const node = nodes.find(n => n.id === selectedNode.id);
	// 		if (node) {
	// 			const { x, y } = node.position;
	// 			reactFlowInstance.zoomTo(10, { x, y });
	// 			reactFlowInstance.fitView({ nodes: [node], padding: 0.1 });
	// 		}
	// 	}
	// };

	return (
		<div className="layoutflow">
			<div className="controls">
				<button className={ direction == 'TB' ? 'active' : ''} onClick={() => setDirection("TB")}>Top-down layout</button>
				<button className={direction == 'LR' ? 'active' : ''}  onClick={() => setDirection("LR")}>Left-to-Right layout</button>
			</div>
			<ReactFlow
				nodes={nodes}
				edges={edges}
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
								{`${selectedNode.data.label}`}
								<span className="material-symbols-sharp">open_in_new</span>
							</a>
						)}
						{/* <button onClick={handleZoomToNode}>Zoom and Center to Node</button> */}
					</div>
				</div>
			)}
		</div>
	);
};