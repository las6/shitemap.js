// Shared geometry contract. Appearance lives in ExplorerTheme.css; layout never
// depends on zoom, interaction state, or whether inspection paths are visible.
export const EXPLORER_METRICS = {
  fontSize: 18, overviewFontSize: 16, rowHeight: 22, padding: 12, controlWidth: 52,
  minWidth: 210, maxWidth: 520, rootWidth: 180,
  columnGap: 70, siblingGap: 20, stackOffset: 8,
  rootFontSize: 24, anchorY: 23, layoutScale: 1.8, inspectionZoom: 0.8, initialOverviewZoom: 0.4, batchSize: 12,
};
