import { NextResponse } from 'next/server';
import { ValidatedSitemapper } from '../../../components/sitemapServer';
import { normalizeSiteInput, validateSitemapData } from '../../../components/sitemapInput';

export async function GET(request) {
	const { searchParams } = request.nextUrl;
	let url;
	try {
		url = normalizeSiteInput(searchParams.get('url'));
	} catch (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
	try {
		const sitemap = new ValidatedSitemapper({ signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]) });
		const data = await sitemap.fetch(url);
		if (data.errors?.length && !data.sites?.length) {
			return NextResponse.json({ error: 'This URL could not be loaded as a sitemap. Check the URL or try again later.' }, { status: 422 });
		}
		const validated = validateSitemapData(data);
		return NextResponse.json(validated, { headers: { 'Cache-Control': new URL(url).search || validated.warnings.length ? 'no-store' : 's-maxage=86400, stale-while-revalidate' } });
	} catch (error) {
		return NextResponse.json({ error: error.message || 'The sitemap could not be loaded. Try again.' }, { status: 422 });
	}
}
