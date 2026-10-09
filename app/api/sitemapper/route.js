import { NextResponse } from 'next/server';
import { ValidatedSitemapper } from '../../../components/sitemapServer';
import { normalizeSiteInput, validateSitemapData } from '../../../components/sitemapInput';
import { apiError } from '../../../components/serverResponses';
import { SitemapError } from '../../../components/sitemapLimits';
import { enforceApiQuota } from '../../../components/apiQuota';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request) {
	const { searchParams } = request.nextUrl;
	const requestId = crypto.randomUUID();
	let url;
	try { await enforceApiQuota(request); } catch (error) { return apiError(error, requestId); }
	try {
		url = normalizeSiteInput(searchParams.get('url'));
	} catch (error) {
		return apiError(new SitemapError('invalid_input', error.message, 400), requestId);
	}
	try {
		const sitemap = new ValidatedSitemapper({ signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]) });
		const data = await sitemap.fetch(url);
		if (data.errors?.length && !data.sites?.length) {
			throw new SitemapError('empty_sitemap', 'This sitemap has no usable pages. Try an individual child sitemap.');
		}
		let validated;
		try { validated = validateSitemapData(data); } catch (error) { throw new SitemapError('empty_sitemap', error.message); }
		return NextResponse.json(validated, { headers: { 'Cache-Control': new URL(url).search || validated.warnings.length ? 'no-store' : 's-maxage=86400, stale-while-revalidate', 'X-Request-ID': requestId } });
	} catch (error) {
		return apiError(error, requestId);
	}
}
