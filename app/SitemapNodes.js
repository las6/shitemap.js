'use client';

import { useEffect, useRef } from 'react';
import { EXPLORER_METRICS as M } from '../components/explorerStyle';
import { BaseEdge, Handle, Position, useUpdateNodeInternals } from '@xyflow/react';

function usePortMetrics(id, data) {
  const update = useUpdateNodeInternals();
  useEffect(() => { update(id); }, [id, data.readability, data.mode, data.inspection, update]);
}
function Ports({ readability }) {
  const row = M.anchorY * readability;
  return <>
    <Handle id="top" type="target" position={Position.Top} />
    <Handle id="left" type="target" position={Position.Left} style={{ top: row }} />
    <Handle id="right" type="source" position={Position.Right} style={{ top: row }} />
    <Handle id="bottom" type="source" position={Position.Bottom} />
    <Handle id="branch" type="source" position={Position.Left} style={{ top: row }} />
  </>;
}
// Bare parent labels toggle on a single click. Delay that action briefly so
// a double activation can center the page without also collapsing its branch.
function usePageActivation(id, data) {
  const pending = useRef(null);
  const touch = useRef(null);
  const pointerStart = useRef(null);
  const suppressClick = useRef(false);
  useEffect(() => () => clearTimeout(pending.current), []);
  const center = () => { clearTimeout(pending.current); touch.current = null; data.onCenter(id); };
  return {
    onClick: event => {
      event.stopPropagation();
      if (suppressClick.current) { suppressClick.current = false; return; }
      if (data.mode === 'bare' && data.childCount && event.detail !== 0) {
        clearTimeout(pending.current);
        pending.current = setTimeout(() => data.onToggle(id), 350);
      } else if (data.mode === 'bare' && data.childCount) data.onToggle(id);
      else data.onSelect(id);
    },
    onDoubleClick: event => { event.stopPropagation(); center(); },
    onPointerDown: event => { pointerStart.current = { x: event.clientX, y: event.clientY }; },
    onPointerUp: event => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const start = pointerStart.current;
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) { touch.current = null; return; }
      const now = performance.now();
      const previous = touch.current;
      if (previous && now - previous.time < 350 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 24) {
        suppressClick.current = true;
        center();
      } else touch.current = { time: now, x: event.clientX, y: event.clientY };
    },
  };
}
export function PageNode({ id, data }) {
  usePortMetrics(id, data);
  const card = useRef(null);
  const update = useUpdateNodeInternals();
  useEffect(() => {
    if (data.mode !== 'bare') return;
    const element = card.current;
    const measure = () => {
      const range = document.createRange();
      range.selectNodeContents(element.querySelector('.sitemap-node-label'));
      const first = range.getClientRects()[0];
      if (!first) return;
      // DOM measurements include canvas zoom; convert back to node coordinates.
      const zoom = element.getBoundingClientRect().width / element.offsetWidth;
      element.style.setProperty('--label-width', (first.right - element.getBoundingClientRect().left) / zoom + 6 * data.readability);
      element.style.setProperty('--label-center', ((first.left + first.right) / 2 - element.getBoundingClientRect().left) / zoom);
      update(id);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [id, data.mode, data.readability, data.inspection, update]);
  const activation = usePageActivation(id, data);
  const bare = data.mode === 'bare';
  const toggleLabel = `${data.collapsed ? 'Expand' : 'Collapse'} ${data.displayLabel} children`;
  return <div ref={card} className={`sitemap-card ${data.isSiteRoot ? 'sitemap-root' : ''} ${!data.url ? 'sitemap-folder' : ''}`}>
    <Ports readability={data.readability} />
    <button className="node-copy nodrag nopan" type="button"
      aria-label={bare && data.childCount ? toggleLabel : `Select ${data.displayLabel}`}
      aria-expanded={bare && data.childCount ? !data.collapsed : undefined}
      {...activation}>
      <span className="sitemap-node-label">{data.displayLabel}</span>
      {data.inspection && !data.isSiteRoot && <span className="sitemap-node-path">{data.path}</span>}
    </button>
    {!bare && data.childCount > 0 && <button type="button" className="nodrag nopan branch-toggle"
      aria-expanded={!data.collapsed} aria-label={toggleLabel}
      onClick={event => { event.stopPropagation(); data.onToggle(id); }}>
      <span aria-hidden="true">{data.collapsed ? '▸' : '▾'}</span><span>{data.childCount}</span>
    </button>}
  </div>;
}
export function StackNode({ id, data }) {
  usePortMetrics(id, data);
  return <div className="sitemap-stack">
    <Handle id="left" type="target" position={Position.Left} style={{ top: M.anchorY * data.readability }} />
    <button type="button" className="nodrag nopan stack-open"
      aria-label={data.remaining ? `Show next ${data.nextCount} children below ${data.parentLabel}` : `Expand ${data.label} below ${data.parentLabel}`}
      aria-expanded={data.remaining ? undefined : false}
      onClick={event => { event.stopPropagation(); if (data.remaining) data.onShowMore(data.parentId); else data.onToggle(data.parentId); }}>
      <span className="sitemap-node-label">{data.label}</span>
      {data.inspection && data.mode !== 'bare' && <span className="sitemap-node-path">{data.remaining ? `Show next ${data.nextCount}` : 'Expand branch'}</span>}
    </button>
  </div>;
}
export function TreePath({ id, sourceX, sourceY, targetX, targetY, data }) {
  if (data.fan) return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} V ${data.spineY} H ${targetX} V ${targetY}`} />;
  const y = Math.abs(sourceY - targetY) < .5 ? sourceY : targetY;
  return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} H ${data.spineX} V ${y} H ${targetX}`} />;
}
