// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default async function handler(req, res) {
	const Sitemapper = require('sitemapper');
	const sitemap = new Sitemapper();

	// console.log(req);

	// const res2 = await sitemap.fetch('https://wp.seantburke.com/sitemap.xml');
	// const res2 = await sitemap.fetch('https://www.roche.fi/sitemap.xml');
	// const res2 = await sitemap.fetch('https://oi.fi/page-sitemap.xml');
	// const res2 = await sitemap.fetch('https://staging.hideoutvillas.com/sitemap.xml');
	// const res2 = await sitemap.fetch('https://www.vaasan.fi/sitemap.xml');
	const res2 = await sitemap.fetch('https://www.cricketlighters.com/sitemap.xml');
	// const res2 = await sitemap.fetch('https://www.dqcomms.com/sitemap.xml');
	// const res2 = await sitemap.fetch('localhost:1357');
	res.status(200).json(res2);
}

