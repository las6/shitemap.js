"use client";

import { useEffect, useState } from "react";
import { Flow } from "../../Flow"; // Adjust the path as needed
import { makeInitialData, getLayoutedElements } from "../../../components/helpers";
import { ReactFlowProvider } from 'reactflow';

const base64UrlDecode = (str) => {
	return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
};

const ViewPage = ({ params }) => {
	const [data, setData] = useState(null);
	const { url } = params;
	const decodedUrl = base64UrlDecode(url); // Decode the URL-safe base64
	const tmpUrl = new URL(decodedUrl);
	const siteConfig = { url: `${tmpUrl.protocol}//${tmpUrl.host}` }; // Set the full URL of the base domain

	useEffect(() => {
		const fetchData = async () => {
			const response = await fetch(`/api/sitemapper?url=${encodeURIComponent(decodedUrl)}`);
			const res2 = await response.json();
			const initialData = makeInitialData(res2);
			const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
				initialData.initialNodes,
				initialData.initialEdges
			);
			setData({ layoutedNodes, layoutedEdges });
		};
		fetchData();
	}, [decodedUrl]);

	// useEffect(() => {
	// 	const handleHashChange = () => {
	// 		const hash = window.location.hash.substring(1);
	// 		if (hash) {
	// 			const node = nodes.find(n => n.id === hash);
	// 			if (node) {
	// 				const { x, y } = node.position;
	// 				reactFlowInstance.zoomTo(1.5, { x, y });
	// 				reactFlowInstance.fitView({ nodes: [node], padding: 0.1 });
	// 				setSelectedNode(node);
	// 				setOpen(true);
	// 			}
	// 		}
	// 	};

	// 	window.addEventListener('hashchange', handleHashChange);
	// 	handleHashChange(); // Trigger on initial load

	// 	return () => {
	// 		window.removeEventListener('hashchange', handleHashChange);
	// 	};
	// }, [data]);

	if (!data) {
		return <div>Loading...</div>;
	}



	return (
		<ReactFlowProvider>
			<Flow data={data} site={siteConfig} />
		</ReactFlowProvider>
	);
};

export default ViewPage;
