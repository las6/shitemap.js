"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const base64UrlEncode = (str) => {
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const PRESETS = [
	{ label: 'Cricket Lighters', url: 'https://www.cricketlighters.com/sitemap.xml' },
	{ label: 'Jalostaja', url: 'https://jalostaja.fi/sitemap_index.xml' },
	{ label: 'Airam', url: 'https://airam.fi/page-sitemap.xml' },
];

const HomePage = () => {
	const [url, setUrl] = useState('');
	const router = useRouter();

	const handleSubmit = (e) => {
		e.preventDefault();
		const encodedUrl = base64UrlEncode(url);
		router.push(`/view/${encodedUrl}`);
	};

	const handlePreset = (presetUrl) => {
		const encodedUrl = base64UrlEncode(presetUrl);
		router.push(`/view/${encodedUrl}`);
	};

	return (
		<div className='front-page'>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="https://example.com/sitemap.xml"
					autoComplete='off'
					required
				/>
				<button type="submit">View</button>
			</form>
			<div className="presets">
				{PRESETS.map((p) => (
					<button key={p.url} className="preset-btn" onClick={() => handlePreset(p.url)}>
						{p.label}
					</button>
				))}
			</div>
		</div>
	);
};

export default HomePage;
