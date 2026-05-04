"use client";

import { useEffect, useState } from "react";
import { Flow } from "../../Flow";
import { makeInitialData } from "../../../components/helpers";
import { ReactFlowProvider } from 'reactflow';

const base64UrlDecode = (str) => {
	return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
};

const ViewPage = ({ params }) => {
	const [rawData, setRawData] = useState(null);
	const { url } = params;
	const decodedUrl = base64UrlDecode(url);
	const tmpUrl = new URL(decodedUrl);
	const siteConfig = { url: `${tmpUrl.protocol}//${tmpUrl.host}` };

	useEffect(() => {
		const fetchData = async () => {
			const response = await fetch(`/api/sitemapper?url=${encodeURIComponent(decodedUrl)}`);
			const res2 = await response.json();
			const { initialNodes, initialEdges } = makeInitialData(res2);
			setRawData({ nodes: initialNodes, edges: initialEdges });
		};
		fetchData();
	}, [decodedUrl]);

	if (!rawData) {
		return <div className="loading-screen">Loading sitemap…</div>;
	}

	return (
		<ReactFlowProvider>
			<Flow rawNodes={rawData.nodes} rawEdges={rawData.edges} site={siteConfig} />
		</ReactFlowProvider>
	);
};

export default ViewPage;
