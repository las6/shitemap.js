'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import ThemeControl from './ThemeControl';
import BackgroundControls from './BackgroundControls';
import { displayLabel } from '../components/explorer';
import './CanvasControls.css';

const OPTIONS = [
  { label: 'View', icon: 'layers', key: 'mode', choices: [['regular', 'Regular'], ['bare', 'Bare']] },
  { label: 'Direction', icon: 'network', key: 'direction', choices: [['horizontal', 'Left to right'], ['vertical', 'Top down']] },
  { label: 'Detail', icon: 'search', key: 'detail', choices: [['auto', 'Auto'], ['overview', 'Overview'], ['inspection', 'Inspect']] },
];

function ToolButton({ icon, label, ...props }) {
  return <button className="canvas-tool" type="button" aria-label={label} title={label} {...props}><Icon name={icon} /></button>;
}

export default function CanvasControls({ presentation, setPresentation, mode, direction, detail, onMode, onDirection, onDetail, zoom, onZoomIn, onZoomOut, onFit, query, onQuery, matches, onReveal, exportContent }) {
  const [panel, setPanel] = useState(null);
  const [active, setActive] = useState(0);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const searchButton = useRef(null);
  const mapButton = useRef(null);
  const appearanceButton = useRef(null);
  const exportButton = useRef(null);
  const values = { mode, direction, detail };
  const setters = { mode: onMode, direction: onDirection, detail: onDetail };
  const results = matches.slice(0, 30);

  const close = () => { setPanel(null); onQuery(''); };
  const choose = node => { onReveal(node.id); close(); searchButton.current?.focus(); };

  useEffect(() => {
    if (panel === 'search') inputRef.current?.focus();
    if (['map', 'appearance', 'export'].includes(panel)) panelRef.current?.querySelector('button')?.focus();
  }, [panel]);

  useEffect(() => {
    if (panel === 'search') panelRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, query, panel]);

  useEffect(() => {
    const keyboard = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPresentation(false);
        setPanel('search');
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setPresentation(false);
        setPanel(null);
        onQuery('');
        if (panel === 'map') mapButton.current?.focus();
        if (panel === 'appearance') appearanceButton.current?.focus();
        if (panel === 'search') searchButton.current?.focus();
        if (panel === 'export') exportButton.current?.focus();
      }
    };
    const outside = event => {
      if (!event.target.closest('.canvas-actions')) { setPanel(null); onQuery(''); }
    };
    document.addEventListener('keydown', keyboard);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', keyboard); document.removeEventListener('pointerdown', outside); };
  }, [setPresentation, onQuery, panel]);

  if (presentation) return <button className="presentation-exit" onClick={() => setPresentation(false)}><Icon name="x" />Exit presentation <kbd>Esc</kbd></button>;

  return <>
    <div className="canvas-actions">
      <div className="canvas-toolgroup" role="toolbar" aria-label="Map tools">
        <ToolButton icon="search" label="Find a page (⌘ / Ctrl K)" ref={searchButton} aria-expanded={panel === 'search'} aria-controls="canvas-search" onClick={() => setPanel(panel === 'search' ? null : 'search')} />
        <ToolButton icon="network" label="Map settings" ref={mapButton} aria-expanded={panel === 'map'} aria-controls="canvas-settings" onClick={() => setPanel('map')} />
        <ToolButton icon="sun" label="Appearance settings" ref={appearanceButton} aria-expanded={panel === 'appearance'} aria-controls="canvas-settings" onClick={() => setPanel('appearance')} />
        <span className="canvas-divider" />
        <ToolButton icon="scan" label="Fit map" onClick={onFit} />
        <ToolButton icon="download" label="Export map" ref={exportButton} aria-expanded={panel === 'export'} aria-controls="canvas-settings" onClick={() => setPanel(panel === 'export' ? null : 'export')} />
        <ToolButton icon="monitor" label="Presentation" onClick={() => { close(); setPresentation(true); }} />
      </div>
      {['map', 'appearance', 'export'].includes(panel) && <div id="canvas-settings" ref={panelRef} className="canvas-panel canvas-settings" role="region" aria-label={panel === 'map' ? 'Map settings' : panel === 'export' ? 'Export map' : 'Appearance settings'}>
        <div className="canvas-panel-heading canvas-settings-heading"><span>{panel === 'map' ? 'Map' : panel === 'export' ? 'Export' : 'Appearance'}</span><ToolButton icon="x" label={`Close ${panel} settings`} onClick={() => { close(); (panel === 'map' ? mapButton : panel === 'export' ? exportButton : appearanceButton).current?.focus(); }} /></div>
        {panel === 'map' ? <>
          {OPTIONS.map(option => <fieldset key={option.key}><legend><Icon name={option.icon} size={14} />{option.label}</legend><div className="canvas-segments">{option.choices.map(([value, label]) => <button type="button" key={value} aria-pressed={values[option.key] === value} onClick={() => setters[option.key](value)}>{label}</button>)}</div></fieldset>)}
          <p>Auto reveals page paths as you zoom in.</p>
        </> : panel === 'export' ? exportContent : <><ThemeControl /><BackgroundControls /></>}
      </div>}
      {panel === 'search' && <div id="canvas-search" className="canvas-panel canvas-search" ref={panelRef}>
        <div className="canvas-search-input"><Icon name="search" /><input ref={inputRef} type="search" aria-label="Find a page" placeholder="Find a page…" value={query} onChange={event => { onQuery(event.target.value); setActive(0); }} role="combobox" aria-expanded="true" aria-autocomplete="list" aria-activedescendant={results[active] && query.trim() ? `page-match-${active}` : undefined} aria-controls="page-search-results" onKeyDown={event => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive(previous => Math.max(0, Math.min(previous + 1, results.length - 1))); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive(previous => Math.max(0, previous - 1)); }
          if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]); }
        }} /><ToolButton icon="x" label="Close search" onClick={() => { close(); searchButton.current?.focus(); }} /></div>
        <div className="canvas-search-results">
          {query.trim() ? <><div className="search-summary" role="status">{matches.length ? `${matches.length} matching pages` : 'No pages found'}</div><div id="page-search-results" role="listbox" aria-label="Matching pages">{results.map((node, i) => <button role="option" aria-selected={i === active} id={`page-match-${i}`} className={i === active ? 'search-active' : ''} key={node.id} onClick={() => choose(node)}><span>{displayLabel(node.data.label)}</span><small>{node.url ? new URL(node.url).pathname : 'Inferred folder'}</small></button>)}</div></> : <p>Search page titles or URLs.<span><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>↵</kbd> to open</span></p>}
        </div>
      </div>}
    </div>
    <div className="canvas-zoom canvas-toolgroup" role="toolbar" aria-label="Map zoom">
      <ToolButton icon="minus" label="Zoom out" onClick={onZoomOut} />
      <button className="canvas-zoom-level" title="Fit map" aria-label={`Zoom ${Math.round(zoom * 100)} percent. Fit map`} onClick={onFit}>{Math.round(zoom * 100)}<span>%</span></button>
      <ToolButton icon="plus" label="Zoom in" onClick={onZoomIn} />
    </div>
  </>;
}
