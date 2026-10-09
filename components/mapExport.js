// Export a measured map as native SVG geometry/text or bounded canvas PNG.
export const EXPORT_LIMITS = { nodes: 2000, text: 300000, side: 8192, pixels: 16000000, padding: 48 };
export const xml = value => String(value).toWellFormed().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '\ufffd').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);

export function exportSize(bounds, format) {
  const width = Math.ceil(bounds.width + 2 * EXPORT_LIMITS.padding), height = Math.ceil(bounds.height + 2 * EXPORT_LIMITS.padding);
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error('The map is not ready to export. Try again shortly.');
  // Raster reduction preserves the entire map, never crops it.
  const scale = format === 'png' ? Math.min(2, EXPORT_LIMITS.side / width, EXPORT_LIMITS.side / height, Math.sqrt(EXPORT_LIMITS.pixels / (width * height))) : 1;
  return { width, height, scale, pixelWidth: Math.max(1, Math.floor(width * scale)), pixelHeight: Math.max(1, Math.floor(height * scale)) };
}
export function exportFilename(site, format) {
  return `${new URL(site).hostname.replace(/[^a-z\d.-]/gi, '_')}-sitemap.${format}`;
}

function textLines(element, position) {
  const style = getComputedStyle(element), range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const lines = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) continue;
      const point = position(rect), previous = lines[lines.length - 1];
      if (previous && Math.abs(previous.y - point.y) < 1) { previous.text += node.data[i]; previous.width = point.x + point.width - previous.x; }
      else lines.push({ ...point, text: node.data[i], family: style.fontFamily, size: parseFloat(style.fontSize), weight: style.fontWeight, color: style.color });
    }
  }
  return lines;
}

export function measureMap(root) {
  const viewport = root.querySelector('.react-flow__viewport');
  if (!viewport) throw new Error('The map is not ready to export.');
  const nodes = [...viewport.querySelectorAll('.react-flow__node')];
  if (!nodes.length) throw new Error('The map is not ready to export.');
  if (nodes.length > EXPORT_LIMITS.nodes) throw new Error('Collapse a few branches before exporting. Exports support up to 2,000 displayed nodes.');
  const textCount = nodes.reduce((count, node) => count + node.textContent.length, 0);
  if (textCount > EXPORT_LIMITS.text) throw new Error('This expanded map has too much text to export. Collapse a few branches.');
  const zoom = new DOMMatrix(getComputedStyle(viewport).transform).a;
  const origin = viewport.getBoundingClientRect();
  const position = rect => ({ x: (rect.left - origin.left) / zoom, y: (rect.top - origin.top) / zoom, width: rect.width / zoom, height: rect.height / zoom });
  const tokens = getComputedStyle(root), color = key => tokens.getPropertyValue(`--explorer-${key}`).trim();
  const bare = root.dataset.mode === 'bare';
  const shapes = [], texts = [], paths = [];
  for (const node of nodes) {
    const card = node.querySelector('.sitemap-card, .sitemap-stack');
    if (!card) continue;
    const rect = position(card.getBoundingClientRect()), style = getComputedStyle(card);
    const stack = card.classList.contains('sitemap-stack'), home = card.classList.contains('sitemap-root');
    const stroke = bare && !stack ? 'none' : color(home ? 'root' : 'border');
    const fill = bare && !stack ? 'none' : color(bare && stack ? 'bg' : home ? 'root' : stack ? 'soft' : 'card');
    const border = parseFloat(style.borderTopWidth);
    if (stack) for (const multiplier of [8, 4]) {
      const offset = multiplier * parseFloat(tokens.getPropertyValue('--readability'));
      shapes.push({ ...rect, x: rect.x + offset, y: rect.y + offset, fill: color('card'), stroke, border, radius: parseFloat(style.borderTopLeftRadius) });
    }
    shapes.push({ ...rect, fill, stroke, border, radius: parseFloat(style.borderTopLeftRadius), dashed: !bare && card.classList.contains('sitemap-folder') });
    for (const label of card.querySelectorAll(stack ? '.sitemap-node-label' : '.sitemap-node-label, .sitemap-node-path')) {
      const lines = textLines(label, position);
      lines.forEach(line => { line.color = color(label.classList.contains('sitemap-node-path') ? 'muted' : home && !bare ? 'root-text' : 'text'); });
      texts.push(...lines);
    }
  }
  for (const path of viewport.querySelectorAll('.react-flow__edge-path')) paths.push({ d: path.getAttribute('d'), color: color('edge'), width: parseFloat(getComputedStyle(path).strokeWidth) / zoom });
  const boxes = [...shapes, ...texts];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const box of boxes) { minX = Math.min(minX, box.x); minY = Math.min(minY, box.y); maxX = Math.max(maxX, box.x + box.width); maxY = Math.max(maxY, box.y + box.height); }
  // Card fill/text is normalized rather than copying hover/selection styles.
  texts.forEach(text => { text.color = text.color || color('text'); });
  return { shapes, texts, paths, background: color('bg'), bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
}

const fontAssets = new Map();
async function embeddedFonts(families) {
  const rules = [];
  for (const sheet of document.styleSheets) {
    let entries;
    try { entries = sheet.cssRules; } catch { continue; }
    for (const rule of entries) if (rule.type === CSSRule.FONT_FACE_RULE && [...families].some(family => family.includes(rule.style.fontFamily.replace(/["']/g, '')))) rules.push({ css: rule.cssText, base: sheet.href || location.href });
  }
  if (rules.length > 24) throw new Error('Too many font assets to export. Try again after reloading.');
  return (await Promise.all(rules.map(async entry => {
    let rule = entry.css;
    const matches = [...rule.matchAll(/url\(["']?([^\s)'" ]+)["']?\)/g)];
    for (const match of matches) {
      const url = new URL(match[1], entry.base);
      if (url.origin !== location.origin) throw new Error('Export requires locally hosted fonts.');
      if (!fontAssets.has(url.href)) fontAssets.set(url.href, (async () => {
        const response = await fetch(url.href, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('The export fonts could not be loaded. Please try again.');
        const blob = await response.blob();
        if (blob.size > 2 * 1024 * 1024) throw new Error('The export font is too large.');
        return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
      })().catch(error => { fontAssets.delete(url.href); throw error; }));
      rule = rule.replace(match[0], `url("${await fontAssets.get(url.href)}")`);
    }
    return rule;
  }))).join('\n');
}

export function mapSvg(map, background, fontCss = '') {
  const size = exportSize(map.bounds, 'svg');
  const x = EXPORT_LIMITS.padding - map.bounds.x, y = EXPORT_LIMITS.padding - map.bounds.y;
  const shapes = map.shapes.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.radius || 0}" fill="${xml(r.fill)}" stroke="${xml(r.stroke)}" stroke-width="${r.border}"${r.dashed ? ' stroke-dasharray="5 4"' : ''}/>`).join('');
  const paths = map.paths.map(p => `<path d="${xml(p.d)}" fill="none" stroke="${xml(p.color)}" stroke-width="${p.width}"/>`).join('');
  const texts = map.texts.map(t => `<text x="${t.x}" y="${t.y}" dominant-baseline="text-before-edge" font-family="${xml(t.family)}" font-size="${t.size}" font-weight="${xml(t.weight)}" fill="${xml(t.color)}" xml:space="preserve">${xml(t.text)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"><title>Expanded sitemap</title><defs><style>${xml(fontCss)}</style></defs>${background ? `<rect width="100%" height="100%" fill="${xml(map.background)}"/>` : ''}<g transform="translate(${x} ${y})">${paths}${shapes}${texts}</g></svg>`;
}

async function mapPng(map, background) {
  const size = exportSize(map.bounds, 'png'), canvas = document.createElement('canvas');
  canvas.width = size.pixelWidth; canvas.height = size.pixelHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create the image. Try SVG instead.');
  context.scale(size.scale, size.scale);
  if (background) { context.fillStyle = map.background; context.fillRect(0, 0, size.width, size.height); }
  context.translate(EXPORT_LIMITS.padding - map.bounds.x, EXPORT_LIMITS.padding - map.bounds.y);
  for (const path of map.paths) { context.strokeStyle = path.color; context.lineWidth = path.width; context.stroke(new Path2D(path.d)); }
  for (const r of map.shapes) {
    context.beginPath(); context.roundRect(r.x, r.y, r.width, r.height, r.radius || 0);
    if (r.fill !== 'none') { context.fillStyle = r.fill; context.fill(); }
    if (r.stroke !== 'none') { context.strokeStyle = r.stroke; context.lineWidth = r.border; context.setLineDash(r.dashed ? [5, 4] : []); context.stroke(); }
  }
  context.setLineDash([]); context.textBaseline = 'top';
  for (const text of map.texts) { context.font = `${text.weight} ${text.size}px ${text.family}`; context.fillStyle = text.color; context.fillText(text.text, text.x, text.y); }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This map could not be rasterized. Try SVG instead.')), 'image/png'));
}

export async function downloadMap(root, site, { format, background }) {
  await document.fonts.ready;
  // Let font/branch measurement and React Flow handle updates settle first.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // Read geometry synchronously: subsequent async font work cannot change this snapshot.
  const map = measureMap(root);
  const blob = format === 'svg' ? new Blob([mapSvg(map, background, await embeddedFonts(new Set(map.texts.map(text => text.family))))], { type: 'image/svg+xml' }) : await mapPng(map, background);
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = exportFilename(site, format); anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const size = exportSize(map.bounds, format);
  return { width: format === 'png' ? size.pixelWidth : size.width, height: format === 'png' ? size.pixelHeight : size.height, reduced: size.scale < 1 };
}
