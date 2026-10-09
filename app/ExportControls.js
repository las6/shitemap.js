'use client';
import { useState } from 'react';
import { downloadMap, copyMap } from '../components/mapExport';

export default function ExportControls({ getRoot, site }) {
  const [format, setFormat] = useState('png');
  const [background, setBackground] = useState(true);
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  async function save(action = 'download') {
    setBusy(action); setStatus('Preparing your map…'); setFailed(false);
    try {
      const result = action === 'copy' ? await copyMap(getRoot(), { background }) : await downloadMap(getRoot(), site, { format, background });
      setStatus(`${action === 'copy' ? 'Copied image' : 'Downloaded'} ${result.width.toLocaleString()} × ${result.height.toLocaleString()}${result.reduced ? ' pixels. Large map scaled to fit.' : '.'}`);
    } catch (error) { setStatus(error.message || 'The map could not be exported. Please try again.'); setFailed(true); }
    finally { setBusy(null); }
  }
  return <>
    <fieldset disabled={busy}><legend>Format</legend><div className="canvas-segments">{['png', 'svg'].map(value => <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}>{value.toUpperCase()}</button>)}</div></fieldset>
    <fieldset disabled={busy}><legend>Background</legend><div className="canvas-segments"><button type="button" aria-pressed={background} onClick={() => setBackground(true)}>Current theme</button><button type="button" aria-pressed={!background} onClick={() => setBackground(false)}>Transparent</button></div></fieldset>
    <p>Includes expanded pages and collections, even off screen. Controls and decorative backgrounds are excluded. PNG scales to at most 8,192 pixels per side and 16 megapixels; choose SVG for large maps.</p>
    <div className="export-actions"><button type="button" className="export-download" disabled={Boolean(busy)} onClick={() => save()}>{busy === 'download' ? 'Preparing…' : `Download ${format.toUpperCase()}`}</button><button type="button" className="export-download" title="Copy as PNG" disabled={Boolean(busy)} onClick={() => save('copy')}>{busy === 'copy' ? 'Copying…' : 'Copy image'}</button></div>
    <p role={failed ? 'alert' : 'status'} aria-live="polite">{status}</p>
  </>;
}
