import './ExplorerTheme.css';
import './SitemapLoading.css';

export default function SitemapLoading({ message = 'Loading sitemap…', onCancel }) {
  return <div className="explorer sitemap-loading">
    <div className="sitemap-loading-message" role="status" aria-live="polite">{message}</div>
    {onCancel && <button className="sitemap-loading-cancel" onClick={onCancel}>Cancel</button>}
  </div>;
}
