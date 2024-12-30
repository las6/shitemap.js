"use client";

import { useEffect, useState } from "react";
import { Flow } from "../../Flow"; // Adjust the path as needed
import { makeInitialData, getLayoutedElements } from "../../../components/helpers";

const base64UrlDecode = (str) => {
	return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
};

const ViewPage = ({ params }) => {
	const [data, setData] = useState(null);
	const { url } = params;
	const decodedUrl = base64UrlDecode(url); // Decode the URL-safe base64

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

	if (!data) {
		return <div>Loading...</div>;
	}

	return <Flow data={data} />;
};

export default ViewPage;
