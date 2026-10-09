// Focus one page and a small amount of its immediate context. These limits
// keep large branches from moving the selected page outside the useful area.
export const PAGE_FOCUS = { zoomFactor: 1.35, maxZoom: 1, children: 3, offsetX: .16, offsetY: .12, usableArea: .68 };
const bounds = node => ({ x: node.position.x, y: node.position.y, width: node.measured?.width || node.width, height: node.measured?.height || node.height });
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function pageFocus(node, children, viewport, currentZoom) {
  const parent = bounds(node);
  const center = { x: parent.x + parent.width / 2, y: parent.y + parent.height / 2 };
  const nearby = children.map(bounds).sort((a, b) =>
    Math.hypot(a.x + a.width / 2 - center.x, a.y + a.height / 2 - center.y) -
    Math.hypot(b.x + b.width / 2 - center.x, b.y + b.height / 2 - center.y)
  ).slice(0, PAGE_FOCUS.children);
  const group = [parent, ...nearby];
  const left = Math.min(...group.map(n => n.x)), right = Math.max(...group.map(n => n.x + n.width));
  const top = Math.min(...group.map(n => n.y)), bottom = Math.max(...group.map(n => n.y + n.height));
  const fitZoom = Math.min(viewport.width * PAGE_FOCUS.usableArea / (right - left), viewport.height * PAGE_FOCUS.usableArea / (bottom - top));
  // Never zoom out or reset someone already inspecting above the focus cap.
  const zoom = Math.max(currentZoom, Math.min(PAGE_FOCUS.maxZoom, currentZoom * PAGE_FOCUS.zoomFactor, fitZoom));
  return {
    x: center.x + clamp((left + right) / 2 - center.x, viewport.width / zoom * PAGE_FOCUS.offsetX),
    y: center.y + clamp((top + bottom) / 2 - center.y, viewport.height / zoom * PAGE_FOCUS.offsetY),
    zoom,
  };
}
