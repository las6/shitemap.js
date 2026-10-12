'use client';

import { useState } from 'react';
import Icon from '../components/Icon';
import usePageMetadata from './usePageMetadata';

export default function PageMetadata({ target, client }) {
  const { result, retryBlocked, retry } = usePageMetadata(client, target);
  const metadata = result?.metadata;
  const unavailable = metadata && ['blocked', 'failed'].includes(metadata.status);
  const loading = !result;
  return <section className="details-metadata" aria-labelledby="page-preview-title" aria-busy={loading}>
    <h3 id="page-preview-title">Page preview</h3>
    <MetadataImage key={metadata?.image || 'placeholder'} url={metadata?.image} target={target} loading={loading} />
    <div className="metadata-title-slot">
      {loading ? <Skeleton lines={2} /> : <p className={metadata?.title ? 'metadata-title' : 'details-note'}>{metadata?.title || 'No title available.'}</p>}
    </div>
    <div className="metadata-description-slot">
      {loading ? <Skeleton lines={4} /> : <p className={metadata?.description ? 'metadata-description' : 'details-note'}>{metadata?.description || 'No description available.'}</p>}
    </div>
    <div className="metadata-feedback" aria-live="polite">
      {loading && <p className="details-note" role="status">Loading page preview…</p>}
      {metadata?.observedAt && <p className="metadata-observed">{metadata.stale ? 'Earlier preview · ' : 'Observed '}
        <time dateTime={metadata.observedAt}>{new Date(metadata.observedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
        {metadata.cache === 'hit' && ' · Cached'}
      </p>}
      {metadata?.status === 'partial' && <p className="details-note">Some preview information may be missing.</p>}
      {(result?.error || unavailable) && <div>
        <p className="details-note" role="status">{result?.error || (metadata.errorCode === 'domain_rate_limited' || metadata.errorCode === 'http_429' ? 'This website is busy. Please wait before trying again.' : 'A preview is unavailable for this page right now.')}</p>
        {retryBlocked && <p className="metadata-observed">Try again after <time dateTime={new Date(result.retryAt).toISOString()}>{new Date(result.retryAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>.</p>}
        <button type="button" className="metadata-action" disabled={retryBlocked} onClick={retry}>Try again</button>
      </div>}
    </div>
  </section>;
}

function Skeleton({ lines }) {
  return <div className="metadata-skeleton" aria-hidden="true">{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>;
}

function MetadataImage({ url, target, loading }) {
  const [image, setImage] = useState({ status: 'loading', ratio: 1200 / 630 });
  const Frame = url ? 'a' : 'div';
  return <Frame className="metadata-image-frame" style={{ aspectRatio: image.ratio }}
    href={url ? target : undefined} target={url ? '_blank' : undefined} rel={url ? 'noopener noreferrer' : undefined}
    aria-label={url ? 'Open previewed page in a new tab' : undefined}>
      {(loading || (url && image.status === 'loading')) && <div className="metadata-image-skeleton" aria-hidden="true" />}
      {!loading && !url && <p className="details-note">No preview image available.</p>}
      {url && image.status === 'loading' && <p className="details-note" role="status">Loading image…</p>}
      {/* Hotlinked in the browser; avoid Next Image's server fetch/proxy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && image.status !== 'failed' && <img className={image.status === 'ready' ? 'metadata-image-ready' : ''} src={url} alt="Page preview" referrerPolicy="no-referrer"
        onLoad={event => setImage({ status: 'ready', ratio: event.currentTarget.naturalWidth / event.currentTarget.naturalHeight || 1200 / 630 })}
        onError={() => setImage(previous => ({ ...previous, status: 'failed' }))} />}
      {url && image.status === 'failed' && <p className="details-note">The preview image couldn’t be loaded. Open page ↗</p>}
      {url && image.status === 'ready' && <span className="metadata-image-open" aria-hidden="true"><Icon name="arrow-up-right" size={14} /></span>}
  </Frame>;
}
