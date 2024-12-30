import { NextResponse } from 'next/server';
const Sitemapper = require('sitemapper');

	// https://wp.seantburke.com/sitemap.xml
	// https://www.roche.fi/sitemap.xml
	// https://oi.fi/page-sitemap.xml
	// https://staging.hideoutvillas.com/sitemap.xml
	// https://www.vaasan.fi/sitemap.xml
	// https://www.cricketlighters.com/sitemap.xml

export async function GET(request) {
	const { searchParams } = request.nextUrl;
	const url = searchParams.get('url');
	if (!url) {
		return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
	}
	console.log('URL', url);

	const sitemap = new Sitemapper();
	const res2 = await sitemap.fetch(url);
	const response = NextResponse.json(res2);

	// Set Cache-Control header to use Vercel's caching
	response.headers.set('Cache-Control', 's-maxage=86400, stale-while-revalidate');

	// Set revalidate property to control ISR caching
	response.revalidate = 86400; // Revalidate every 24 hours

	return response;
}
