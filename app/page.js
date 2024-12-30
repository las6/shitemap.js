"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const base64UrlEncode = (str) => {
	return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const HomePage = () => {
	const [url, setUrl] = useState("https://www.cricketlighters.com/sitemap.xml");
	const router = useRouter();

	const handleSubmit = (e) => {
		e.preventDefault();
		const encodedUrl = base64UrlEncode(url); // Encode the URL using URL-safe base64
		router.push(`/view/${encodedUrl}`);
	};

	return (
		<div>
			<h1>Enter Sitemap URL</h1>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="Enter sitemap URL"
					autoComplete='domain'
					required
				/>
				<button type="submit">Submit</button>
			</form>
		</div>
	);
};

export default HomePage;