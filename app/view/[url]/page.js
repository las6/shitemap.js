"use client";

import { use, useEffect, useState } from "react";
import { Flow } from "../../Flow";
import { makeInitialData } from "../../../components/helpers";
import { ReactFlowProvider } from '@xyflow/react';
import Link from 'next/link';
import { decodeSitemapUrl, normalizeSiteInput } from '../../../components/sitemapInput';
import { loadSitemap } from '../../../components/sitemapClient';
import SitemapLoading from '../../SitemapLoading';
import '../../ExplorerTheme.css';
import './ViewStatus.css';

const ViewPage = ({ params }) => {
	const { url } = use(params);
	const [result, setResult] = useState(null);
	const [attempt, setAttempt] = useState(0);
	let decodedUrl;
	try { decodedUrl = normalizeSiteInput(decodeSitemapUrl(url)); } catch { decodedUrl = null; }

	useEffect(() => {
		if (!decodedUrl) return;
		const controller = new AbortController();
		const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
		const fetchData = async () => {
			try {
				const data = await loadSitemap(decodedUrl, signal);
				const { initialNodes, initialEdges } = makeInitialData(data);
				if (!initialNodes.length) throw new Error('This sitemap has no pages to display.');
				if (!signal.aborted) setResult({ source: decodedUrl, attempt, nodes: initialNodes, edges: initialEdges, site: { url: new URL(data.sites[0]).origin }, warnings: data.warnings });
			} catch (error) {
				if (!controller.signal.aborted) setResult({ source: decodedUrl, attempt, error: error.name === 'TimeoutError' ? 'Loading this sitemap took too long. Try again.' : error instanceof TypeError || error instanceof SyntaxError ? 'We could not reach the sitemap service. Try again.' : error.message });
			}
		};
		fetchData();
		return () => controller.abort();
	}, [decodedUrl, attempt]);

	const current = result?.source === decodedUrl && result?.attempt === attempt ? result : null;
	if (!decodedUrl || current?.error) {
		return <div className="explorer view-status"><div><h1>We couldn’t open this sitemap</h1><p role="alert">{decodedUrl ? current.error : 'This sitemap link is invalid. Enter a website to start again.'}</p><div className="view-status-actions">{decodedUrl && <button onClick={() => setAttempt(value => value + 1)}>Try again</button>}<Link href="/">Try another website</Link></div></div></div>;
	}
	if (!current) return <SitemapLoading />;

	return (
		<ReactFlowProvider>
			<Flow rawNodes={current.nodes} rawEdges={current.edges} site={current.site} warnings={current.warnings} />
		</ReactFlowProvider>
	);
};

export default ViewPage;
