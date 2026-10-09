'use client';

import { createContext, memo, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { EXPLORER_METRICS as M } from '../components/explorerStyle';
import { BaseEdge, Handle, Position, useUpdateNodeInternals } from '@xyflow/react';

// Coalesce all connector refreshes into one React Flow update per frame.
// Read label geometry for every node before writing any CSS, avoiding reflows
// between individual nodes. Scope queues to each map's update function.
const PortUpdateContext = createContext(null);
export function NodeMeasurementProvider({ children }) {
  const update = useUpdateNodeInternals();
  return <PortUpdateContext.Provider value={update}>{children}</PortUpdateContext.Provider>;
}
const measurementQueues = new WeakMap();
function queueMeasurement(id, update, measure) {
  let queue = measurementQueues.get(update);
  if (!queue) {
    queue = new Map();
    measurementQueues.set(update, queue);
    requestAnimationFrame(() => {
      measurementQueues.delete(update);
      const writes = [...queue.values()].map(read => read?.()).filter(Boolean);
      writes.forEach(write => write());
      if (queue.size) update([...queue.keys()]);
    });
  }
  queue.set(id, measure || queue.get(id));
}
function usePortMetrics(id, data) {
  const update = useContext(PortUpdateContext);
  useEffect(() => { queueMeasurement(id, update); }, [id, data.mode, data.direction, data.childCount, data.collapsed, update]);
}
function Ports({ data }) {
  const row = M.anchorY * data.readability;
  const horizontal = data.direction === 'horizontal';
  const fan = !horizontal && data.isSiteRoot && !data.collapsed;
  const bareBranch = data.mode === 'bare' && !horizontal;
  // Every hidden handle is still measured by React Flow. Keep only the ports
  // used by this node's incoming edge and current branch direction.
  return <>
    {!data.isSiteRoot && (horizontal || !data.isTopLevel
      ? <Handle id="left" type="target" position={Position.Left} style={{ top: row }} />
      : <Handle id="top" type="target" position={Position.Top} />)}
    {data.childCount > 0 && (horizontal
      ? <Handle id="right" type="source" position={Position.Right} style={{ top: row }} />
      : fan ? <Handle id="bottom" type="source" position={Position.Bottom} />
        : <Handle id="branch" type="source" position={bareBranch ? Position.Bottom : Position.Left} style={bareBranch ? { left: 'calc(var(--label-center) * 1px)' } : { top: row }} />)}
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
export const PageNode = memo(function PageNode({ id, data }) {
  usePortMetrics(id, data);
  const card = useRef(null);
  const currentData = useRef(data);
  useLayoutEffect(() => { currentData.current = data; }, [data]);
  const update = useContext(PortUpdateContext);
  useEffect(() => {
    if (data.mode !== 'bare') return;
    const element = card.current;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const range = document.createRange();
      range.selectNodeContents(element.querySelector('.sitemap-node-label'));
      const first = range.getClientRects()[0];
      if (!first) return;
      // DOM measurements include canvas zoom; convert back to node coordinates.
      const bounds = element.getBoundingClientRect();
      const zoom = bounds.width / element.offsetWidth;
      const width = (first.right - bounds.left) / zoom + 6 * currentData.current.readability;
      const center = ((first.left + first.right) / 2 - bounds.left) / zoom;
      return () => {
        element.style.setProperty('--label-width', width);
        element.style.setProperty('--label-center', center);
      };
    };
    const schedule = () => queueMeasurement(id, update, measure);
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    document.fonts.ready.then(schedule);
    return () => { disposed = true; observer.disconnect(); };
  }, [id, data.mode, data.displayLabel, update]);
  const activation = usePageActivation(id, data);
  const bare = data.mode === 'bare';
  const toggleLabel = `${data.collapsed ? 'Expand' : 'Collapse'} ${data.displayLabel} children`;
  return <div ref={card} className={`sitemap-card ${data.isSiteRoot ? 'sitemap-root' : ''} ${!data.url ? 'sitemap-folder' : ''}`}>
    <Ports data={data} />
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
});
export const StackNode = memo(function StackNode({ id, data }) {
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
});
export function TreePath({ id, sourceX, sourceY, targetX, targetY, data }) {
  if (data.fan) return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} V ${data.spineY} H ${targetX} V ${targetY}`} />;
  // Bare vertical branches continue straight below the visible label centre.
  if (data.bareBranch) return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} V ${targetY} H ${targetX}`} />;
  const y = Math.abs(sourceY - targetY) < .5 ? sourceY : targetY;
  return <BaseEdge id={id} path={`M ${sourceX} ${sourceY} H ${data.spineX} V ${y} H ${targetX}`} />;
}
