'use client';

import { useCallback, useEffect } from 'react';
import ReactFlow, {
	MiniMap,
	Controls,
	ConnectionLineType,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
} from 'reactflow';

// 👇 you need to import the reactflow styles
import 'reactflow/dist/style.css';
import { getLayoutedElements } from '../components/helpers';

export const Flow = (props) => {

	const [nodes, setNodes, onNodesChange] = useNodesState(
		props.data.layoutedNodes
	);
	const [edges, setEdges, onEdgesChange] = useEdgesState(
		props.data.layoutedEdges
	);

	useEffect(() => {
		setNodes(props.data.layoutedNodes);
		setEdges(props.data.layoutedEdges);
	}, [props.data]);

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
	const onEdgeUpdate = useCallback(
		(oldEdge, newConnection) =>
			setEdges((els) => updateEdge(oldEdge, newConnection, els)),
		[]
	);

	return (
		<div className="layoutflow">
			<div className="controls">
				<button onClick={() => onLayout('TB')}>Top-down layout</button>
				<button onClick={() => onLayout('LR')}>Left-to-Right layout</button>
			</div>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodesConnectable={false}
				nodesDraggable={true}
				onConnect={onConnect}
				onEdgeUpdate={onEdgeUpdate}
				connectionLineType={ConnectionLineType.SmoothStep}
				proOptions={{ hideAttribution: false }}
				snapToGrid
				fitView
			>
				<MiniMap />
				<Controls />
				<Background />
			</ReactFlow>
		</div>
	);
};