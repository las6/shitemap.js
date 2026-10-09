// Read actual browser wrapping without measuring every character. Labels contain
// plain text: line positions are monotonic even when a line has bidi fragments.
export function textLines(element, position) {
  const style = getComputedStyle(element), range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const lines = [];
  const append = (text, rect) => {
    if (!rect.width && !rect.height) return;
    const point = position(rect), previous = lines[lines.length - 1];
    if (previous && Math.abs(previous.y - point.y) < 1) {
      const right = Math.max(previous.x + previous.width, point.x + point.width);
      previous.x = Math.min(previous.x, point.x);
      previous.width = right - previous.x;
      previous.text += text;
    } else lines.push({ ...point, text, family: style.fontFamily, size: parseFloat(style.fontSize), weight: style.fontWeight, color: style.color });
  };
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.length) continue;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    if (!rects.length) continue;
    const firstY = position(rects[0]).y;
    if (rects.every(rect => Math.abs(position(rect).y - firstY) < 1)) {
      append(node.data, range.getBoundingClientRect());
      continue;
    }
    const character = index => {
      range.setStart(node, index); range.setEnd(node, index + 1);
      return range.getBoundingClientRect();
    };
    let start = 0;
    while (start < node.length) {
      const y = position(character(start)).y;
      let low = start + 1, high = node.length;
      // Find the first character on the following line in O(log text length).
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (Math.abs(position(character(middle)).y - y) < 1) low = middle + 1;
        else high = middle;
      }
      range.setStart(node, start); range.setEnd(node, low);
      append(node.data.slice(start, low), range.getBoundingClientRect());
      start = low;
    }
  }
  return lines;
}
