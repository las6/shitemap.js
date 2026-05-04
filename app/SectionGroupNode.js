'use client';

import { Handle, Position } from 'reactflow';

export default function SectionGroupNode({ data, selected }) {
	return (
		<div className={`section-group-node${selected ? ' selected' : ''}`}>
			<Handle type="target" position={Position.Top} />
			<div className="section-group-header">{data.label}</div>
			{/* Descendant nodes are rendered by ReactFlow as sibling DOM nodes
			    offset to local coordinates — they visually appear inside this box */}
		</div>
	);
}
