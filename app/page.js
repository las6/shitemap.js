'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../components/Icon';
import Wordmark from '../components/Wordmark';
import { encodeSitemapUrl, isSitemapUrl, normalizeSiteInput } from '../components/sitemapInput';
import { loadSitemap } from '../components/sitemapClient';
import SitemapLoading from './SitemapLoading';
import CircuitSurface from './CircuitSurface';
import LandingAppearance from './LandingAppearance';
import './ExplorerTheme.css';
import './Landing.css';

const PRESETS = [
  { label: 'Vite', url: 'vite.dev', description: 'Small documentation' },
  { label: 'Next.js', url: 'nextjs.org', description: 'Docs & learning paths' },
  { label: 'Linear', url: 'linear.app', description: 'Product & changelog' },
];

function SampleMap() {
  return <div className="landing-map" aria-label="Example sitemap: Home connects to Products, Blog and About. Products contains Furniture and Lighting; Blog contains a collection of 60 pages.">
    <svg className="landing-map-lines" viewBox="0 0 540 340" fill="none" aria-hidden="true"><path d="M90 55H125V285H154M125 55H154M125 170H154M292 55H322V113H348M322 55H348M292 170H348" /></svg>
    <span className="sample-node sample-home">Home</span>
    <span className="sample-node sample-products">Products</span>
    <span className="sample-node sample-furniture">Furniture</span>
    <span className="sample-node sample-lighting">Lighting</span>
    <span className="sample-node sample-blog">Blog</span>
    <span className="sample-node sample-stack"><span>60 other pages</span></span>
    <span className="sample-node sample-about">About</span>
  </div>;
}

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [choices, setChoices] = useState([]);
  const [discovery, setDiscovery] = useState(null);
  const pending = useRef(null);
  const [opening, startOpening] = useTransition();
  const router = useRouter();
  useEffect(() => () => pending.current?.abort(), []);
  const openMap = async (value, direct = false) => {
    if (pending.current) return;
    setError('');
    if (!direct) { setChoices([]); setDiscovery(null); }
    let target;
    try { target = normalizeSiteInput(value); } catch (error) { setError(error.message); return; }
    const controller = new AbortController();
    pending.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
    try {
      let sitemapUrl = target;
      if (!direct && !isSitemapUrl(target)) {
        setProgress('Finding your sitemap…');
        const response = await fetch('/api/discover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target }), signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The sitemap could not be found. Try a sitemap XML URL.');
        setDiscovery(result.discovery);
        if (!result.locations?.length) {
          throw new Error(result.discovery?.status === 'blocked'
            ? 'This site blocked sitemap discovery. Try pasting its sitemap XML URL.'
            : ['partial', 'failed'].includes(result.discovery?.status)
              ? 'We could not finish checking this site. Try again or paste a sitemap XML URL.'
              : 'No sitemap was found for this site. Try pasting its sitemap XML URL.');
        }
        if (result.locations.length > 1) { setChoices(result.locations); return; }
        sitemapUrl = result.locations[0];
      }
      setProgress('Reading your sitemap…');
      await loadSitemap(sitemapUrl, signal);
      if (!signal.aborted) startOpening(() => router.push(`/view/${encodeSitemapUrl(sitemapUrl)}`));
    } catch (error) {
      if (!controller.signal.aborted) setError(error.name === 'TimeoutError' ? 'This is taking too long. Try again or use another sitemap URL.' : error instanceof TypeError || error instanceof SyntaxError ? 'We could not reach the sitemap service. Try again.' : error.message);
    } finally {
      pending.current = null;
      setProgress('');
    }
  };
  const busy = Boolean(progress);
  const updateInput = value => { setUrl(value); setError(''); setChoices([]); setDiscovery(null); };
  const cancelLoading = () => { pending.current?.abort(); };
  if (busy || opening) return <SitemapLoading message={progress || 'Loading sitemap…'} onCancel={opening ? undefined : cancelLoading} />;
  return <div className="landing">
    <CircuitSurface />
    <div className="landing-toolbar"><LandingAppearance /></div>
    <div className="landing-content">
      <h1 className="landing-wordmark"><Wordmark /></h1>
      <div className="landing-main">
        <section className="landing-start" aria-label="Explore a website">
          <form className="landing-form" onSubmit={event => { event.preventDefault(); openMap(url); }}>
            <div className="landing-input-row" data-invalid={Boolean(error)}><input id="sitemap-url" type="text" inputMode="url" aria-label="Website or sitemap URL" aria-describedby="sitemap-hint sitemap-feedback" aria-invalid={Boolean(error)} value={url} onChange={event => updateInput(event.target.value)} placeholder="Enter a website" autoComplete="url" autoCapitalize="none" spellCheck={false} readOnly={busy} required /><button type="submit" disabled={busy} aria-label={busy ? progress : 'Explore website'}>{busy ? <span className="landing-spinner" aria-hidden="true" /> : <Icon name="arrow-right" size={24} />}</button></div>
            <p className="landing-hint" id="sitemap-hint">A domain, a URL, or a sitemap. We’ll find the pages.</p>
            <div id="sitemap-feedback" aria-live="polite" aria-atomic="true">{error && <p className="landing-error" role="alert">{error}</p>}</div>
          </form>
          {choices.length > 0 && <div className="landing-choices" aria-label="Choose a sitemap"><p>We found {choices.length} sitemaps. Choose one to explore.</p>{choices.map(location => <button key={location} disabled={busy} onClick={() => openMap(location, true)}><span>{new URL(location).host}{new URL(location).pathname}{new URL(location).search}</span><Icon name="arrow-right" size={18} /></button>)}</div>}
          {discovery && (discovery.status === 'partial' || discovery.stale) && <p className="landing-discovery-note">{discovery.status === 'partial' ? 'Some sitemap locations could not be checked. ' : ''}{discovery.stale ? 'Using an earlier discovery result. ' : ''}{discovery.observedAt && <>Last checked <time dateTime={discovery.observedAt}>{new Date(discovery.observedAt).toLocaleDateString()}</time>.</>}</p>}
          <div className="landing-examples"><span>Try a real site</span><div>{PRESETS.map(preset => <button key={preset.url} disabled={busy} onClick={() => { updateInput(preset.url); openMap(preset.url); }}><span className="landing-example-name">{preset.label}<Icon name="arrow-up-right" size={13} /></span><span className="landing-example-description">{preset.description}</span></button>)}</div></div>
        </section>
        <section className="landing-preview" aria-label="Sitemap preview"><SampleMap /><button className="landing-demo" disabled={busy} onClick={() => openMap(`${window.location.origin}/sitemap-review.xml`, true)}>Explore an example <Icon name="arrow-right" size={16} /></button></section>
      </div>
    </div>
    <a className="landing-credit" href="https://las6.net" target="_blank" rel="noopener noreferrer">By las6 <Icon name="arrow-up-right" size={12} /></a>
  </div>;
}
