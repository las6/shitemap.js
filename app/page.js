// 'use client';
import { Flow } from './Flow';
import { makeInitialData, getLayoutedElements } from '../components/helpers'

// app/page.js
// This file maps to the index route (/)

async function getData() {
	const res = await fetch('http://localhost:3000/api/sitemapper');
	// The return value is *not* serialized
	// You can return Date, Map, Set, etc.
	return res.json();
}


const Page = async () => {
	const shitemap = await getData();
	const initialData = makeInitialData(shitemap);
	const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
		initialData.initialNodes,
		initialData.initialEdges
	);

	// console.log('nodes', layoutedNodes);
	// console.log('layoutedEdges', layoutedEdges);

	// return <div>test</div>;
	return <Flow data={{ layoutedNodes, layoutedEdges }} />;
}


// function asyncComponent(fn) {
// 	return fn;
// }

// const Page = asyncComponent(_Page);

export default Page;