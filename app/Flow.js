'use client';

import Link from 'next/link';
import Image from 'next/image';
import CanvasControls from './CanvasControls';
import ExportControls from './ExportControls';
import CircuitSurface from './CircuitSurface';
import PageDetails from './PageDetails';
import useViewSettings from './useViewSettings';
import Wordmark from '../components/Wordmark';
import { pageFocus } from '../components/pageFocus';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, useReactFlow, useStore } from '@xyflow/react';
import { createMetadataClient } from '../components/metadataClient';
import '@xyflow/react/dist/style.css';
import './Explorer.css';
import './ExplorerTheme.css';
import { EXPLORER_METRICS as M } from '../components/explorerStyle';
import { NodeMeasurementProvider, PageNode, StackNode, TreePath } from './SitemapNodes';
import { indexTree, initialCollapsed, ancestorIds, descendantIds, explorerLayout, displayLabel } from '../components/explorer';

const nodeTypes = { page: PageNode, stack: StackNode };
const edgeTypes = { treePath: TreePath };
const selectZoom = state => state.transform[2];
const mapPadding = { top: '95px', bottom: '100px', left: '40px', right: '40px' };

export const Flow = ({ rawNodes, rawEdges, site, warnings = [] }) => {
  const metadataClient = useMemo(() => createMetadataClient(), []);
  useEffect(() => () => metadataClient.dispose(), [metadataClient]);
  const tree = useMemo(() => indexTree(rawNodes, rawEdges), [rawNodes, rawEdges]);
  const [collapsed, setCollapsed] = useState(() => initialCollapsed(tree));
  const [limits, setLimits] = useState(new Map());
  const [selectedId, setSelectedId] = useState(null);
  const [presentation, setPresentation] = useState(false);
  const [{ mode, direction, detail }, updateSetting] = useViewSettings();
  const [query, setQuery] = useState('');
  const instance = useReactFlow();
  const zoom = useStore(selectZoom);
  const initialFit = useRef(false);
  const canvas = useRef(null);
  const focusRequest = useRef(null);
  const refitRequest = useRef(false);
  const previousView = useRef({ mode, direction });
  const selected = tree.byId.get(selectedId);
  const scale = Math.max(1, Math.min(M.layoutScale, 1 / zoom));
  // Reserve room for enlarged type so zooming doesn't trigger layout jumps.
  const layout = useMemo(() => explorerLayout(tree, collapsed, M.layoutScale, limits, { mode, direction }), [tree, collapsed, limits, mode, direction]);

  const toggle = useCallback(id => {
    // Keep the viewport fixed while the branch contracts; only explicit Fit or
    // search navigation changes the camera.
    if (selectedId && ancestorIds(tree, selectedId).includes(id)) history.replaceState(null, '', `#${id}`);
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedId(previous => previous && ancestorIds(tree, previous).includes(id) ? id : previous);
  }, [tree, selectedId]);

  const showMore = useCallback(id => {
    setLimits(previous => new Map(previous).set(id, (previous.get(id) || M.batchSize) + M.batchSize));
  }, []);

  const reveal = useCallback((id, center = true) => {
    if (!tree.byId.has(id)) return;
    setCollapsed(previous => {
      const next = new Set(previous);
      ancestorIds(tree, id).forEach(parent => next.delete(parent));
      return next;
    });
    setLimits(previous => {
      const next = new Map(previous);
      let child = id;
      for (const parent of ancestorIds(tree, id)) {
        const index = tree.children.get(parent).indexOf(child);
        if (index >= (next.get(parent) || M.batchSize)) next.set(parent, index + 1);
        child = parent;
      }
      return next;
    });
    setSelectedId(id);
    if (center) focusRequest.current = { id, branch: false };
    history.replaceState(null, '', `#${id}`);
  }, [tree]);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (id) reveal(id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [reveal]);

  useEffect(() => {
    const previous = previousView.current;
    if (initialFit.current && (previous.mode !== mode || previous.direction !== direction)) {
      refitRequest.current = true;
    }
    previousView.current = { mode, direction };
  }, [mode, direction]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (refitRequest.current) {
        refitRequest.current = false;
        focusRequest.current = null;
        instance.fitView({ nodes: layout.nodes, padding: mapPadding, maxZoom: 1, duration: 250 });
      } else if (focusRequest.current) {
        const { id, branch, viewport } = focusRequest.current;
        const ids = branch ? new Set([id, ...descendantIds(tree, id)]) : new Set([id]);
        const focusNodes = layout.nodes.filter(node => ids.has(node.id) || (branch && ids.has(node.data.parentId)));
        focusRequest.current = null;
        initialFit.current = true;
        if (viewport) instance.setViewport(viewport, { duration: 250 });
        else instance.fitView({ nodes: focusNodes, padding: branch ? 0.25 : 0.8, maxZoom: 1, duration: 250 });
      } else if (!initialFit.current) {
        initialFit.current = true;
        const bounds = instance.getNodesBounds(layout.nodes);
        const viewport = { width: canvas.current.clientWidth, height: canvas.current.clientHeight };
        const fitZoom = Math.min((viewport.width - 80) / bounds.width, (viewport.height - 195) / bounds.height);
        const root = layout.nodes.find(node => node.data.isSiteRoot);
        if (root && fitZoom < M.initialOverviewZoom) {
          const children = new Set(layout.edges.filter(edge => edge.source === root.id).map(edge => edge.target));
          const focus = pageFocus(root, layout.nodes.filter(node => children.has(node.id)), viewport, M.initialOverviewZoom);
          instance.setCenter(focus.x, focus.y, { zoom: focus.zoom });
        } else instance.fitView({ padding: mapPadding, maxZoom: 1 });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [layout, selectedId, instance, tree, detail]);

  const centerPage = useCallback(id => {
    const node = instance.getNode(id);
    if (!node) return;
    reveal(id, false);
    const childIds = new Set(layout.edges.filter(edge => edge.source === id).map(edge => edge.target));
    const children = instance.getNodes().filter(child => childIds.has(child.id));
    const focus = pageFocus(node, children, { width: canvas.current.clientWidth, height: canvas.current.clientHeight }, instance.getZoom());
    instance.setCenter(focus.x, focus.y, { zoom: focus.zoom, duration: 250 });
  }, [instance, reveal, layout.edges]);

  const inspection = detail === 'inspection' || (detail === 'auto' && zoom >= M.inspectionZoom);
  const highlighted = useMemo(() => new Set(selectedId && tree.parent.has(selectedId) ? descendantIds(tree, selectedId) : []), [tree, selectedId]);
  const selectPage = useCallback(id => reveal(id, false), [reveal]);
  const nodes = useMemo(() => layout.nodes.map(node => ({ ...node,
    selected: node.id === selectedId,
    className: highlighted.has(node.id) || (node.type === 'stack' && ((node.data.parentId === selectedId && tree.parent.has(selectedId)) || highlighted.has(node.data.parentId))) ? 'branch-highlight' : '',
    data: { ...node.data, url: node.url, onToggle: toggle, onShowMore: showMore, readability: scale, mode, direction, inspection, onSelect: selectPage, onCenter: centerPage,
      path: node.url ? new URL(node.url).pathname : node.data.fullPath,
      parentLabel: tree.byId.get(node.data.parentId)?.data.label } })),
  [layout.nodes, selectedId, highlighted, toggle, showMore, scale, mode, direction, inspection, selectPage, centerPage, tree]);
  const ancestors = selected ? ancestorIds(tree, selectedId).reverse().map(id => tree.byId.get(id)) : [];
  const matches = query.trim() ? rawNodes.filter(node => `${node.data.label} ${node.url || node.data.fullPath}`.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return <div className={`app-layout explorer ${presentation ? 'presentation-mode' : ''}`} data-mode={mode} data-direction={direction} data-inspection={inspection} style={{ '--readability': scale, '--node-font-size': inspection ? M.fontSize : M.overviewFontSize, '--node-row-height': M.rowHeight, '--node-padding': M.padding, '--node-control-width': M.controlWidth, '--root-font-size': M.rootFontSize }}>
    <div className="sitemap-pane" ref={canvas}>
      <CircuitSurface context="map" />
      <div className="explorer-site" aria-label="Current sitemap">
        <Link href="/" className="explorer-home" aria-label="New sitemap" title="New sitemap"><Image src="/favicon.svg" alt="" width={32} height={32} /></Link>
        <div className="explorer-site-identity"><span className="explorer-domain">{new URL(site.url).hostname.replace(/^www\./, '')}</span><span className="explorer-total">{rawNodes.filter(node => node.url).length} pages</span></div>
      </div>
      {warnings.length > 0 && <details className="explorer-warning"><summary>Map may be incomplete</summary><p role="status">{warnings.join(' ')}</p></details>}
      <Link href="/" className="explorer-watermark" aria-label="Shitemap home"><Wordmark /></Link>
      <CanvasControls presentation={presentation} setPresentation={setPresentation} mode={mode} direction={direction} detail={detail}
        onMode={value => updateSetting('mode', value)} onDirection={value => updateSetting('direction', value)} onDetail={value => updateSetting('detail', value)} zoom={zoom}
        onZoomIn={() => instance.zoomIn({ duration: 150 })} onZoomOut={() => instance.zoomOut({ duration: 150 })}
        onFit={() => instance.fitView({ padding: mapPadding, maxZoom: 1, duration: 250 })}
        query={query} onQuery={setQuery} matches={matches} onReveal={reveal}
        exportContent={<ExportControls getRoot={() => canvas.current.closest('.explorer')} site={site.url} />} />
      <div className="layoutflow">
        <NodeMeasurementProvider><ReactFlow nodes={nodes} edges={layout.edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodesConnectable={false} nodesDraggable={false}
          edgesFocusable={false} zoomOnDoubleClick={false} onNodeDoubleClick={(_, node) => { if (node.type === 'page') centerPage(node.id); }} onNodeClick={(_, node) => { if (node.type === 'page') reveal(node.id, false); }}
          onPaneClick={() => { setSelectedId(null); history.replaceState(history.state, '', window.location.pathname + window.location.search); }}
          minZoom={0.02} maxZoom={2} proOptions={{ hideAttribution: false }}>

        </ReactFlow></NodeMeasurementProvider>
      </div>
      {!presentation && selected && <PageDetails page={selected} isRoot={!tree.parent.has(selectedId)} ancestors={ancestors}
        metadataClient={metadataClient}
        childCount={tree.children.get(selectedId)?.length || 0} collapsed={collapsed.has(selectedId)}
        onClose={() => { setSelectedId(null); history.replaceState(history.state, '', window.location.pathname + window.location.search); }}
        onReveal={reveal} onToggle={toggle} />}

    </div>
  </div>;
};
