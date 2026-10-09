import { validateSitemapData } from './sitemapInput';

// Carry the verified result into the viewer without fetching the sitemap twice.
let verifiedSitemap;

export async function loadSitemap(url, signal) {
  if (verifiedSitemap?.url === url && Date.now() - verifiedSitemap.loadedAt < 60000) return verifiedSitemap.data;
  const response = await fetch(`/api/sitemapper?url=${encodeURIComponent(url)}`, { signal });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'The sitemap could not be loaded. Try again.');
    error.code = data.code;
    error.candidates = data.candidates;
    throw error;
  }
  const validated = validateSitemapData(data);
  verifiedSitemap = { url, loadedAt: Date.now(), data: validated };
  return validated;
}
