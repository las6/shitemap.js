'use client';

import Icon from '../components/Icon';
import { displayLabel } from '../components/explorer';
import './PageDetails.css';
import PageMetadata from './PageMetadata';

export default function PageDetails({ page, isRoot, ancestors, childCount, collapsed, onClose, onReveal, onToggle, metadataClient }) {
  const label = isRoot ? 'Home' : displayLabel(page.data.label);
  const pageUrl = page.url ? new URL(page.url) : null;
  return <aside className="explorer-inspector" aria-labelledby="page-details-title">
    <div className="details-heading"><span className="details-kind">{isRoot ? 'Site root' : page.url ? 'Page' : 'Inferred folder'}</span><button className="details-close" type="button" aria-label="Close page details" onClick={onClose}><Icon name="x" size={18} /></button></div>
    <h2 id="page-details-title">{label}</h2>
    {ancestors.length > 0 && <nav className="details-ancestry" aria-label="Page ancestry">{ancestors.map((node, index) => <span key={node.id}>{index > 0 && <span aria-hidden="true" className="details-separator">/</span>}<button type="button" onClick={() => onReveal(node.id)}>{index === 0 ? 'Home' : displayLabel(node.data.label)}</button></span>)}</nav>}
    {pageUrl ? <a className="details-link" href={page.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} in a new tab`}><span><strong>Open page</strong><small>{pageUrl.hostname}{pageUrl.pathname}{pageUrl.search}{pageUrl.hash}</small></span><Icon name="arrow-up-right" size={18} /></a> : <p className="details-note">Groups pages under this path. No page is listed here in the sitemap.</p>}
    {childCount > 0 && <button className="details-branch" type="button" aria-expanded={!collapsed} onClick={() => onToggle(page.id)}><Icon name="chevron-down" size={16} className={collapsed ? 'details-chevron-collapsed' : ''} /><span>{collapsed ? 'Expand children' : 'Collapse children'}</span><span className="details-count">{childCount}</span></button>}
    {pageUrl && <PageMetadata key={page.url} target={page.url} client={metadataClient} />}
  </aside>;
}
