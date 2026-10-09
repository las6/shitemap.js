import { expect, it } from 'vitest';
import { pageFocus, PAGE_FOCUS } from './pageFocus';
const parent = { position: { x: 0, y: 0 }, width: 200, height: 60 };
const viewport = { width: 1000, height: 800 };
it('centers leaves with a gentle zoom and preserves existing close inspection', () => {
  expect(pageFocus(parent, [], viewport, .5)).toEqual({ x: 100, y: 30, zoom: .675 });
  expect(pageFocus(parent, [], viewport, 1.5)).toEqual({ x: 100, y: 30, zoom: 1.5 });
});
it('includes immediate child context when it fits', () => {
  const child = { position: { x: 300, y: 0 }, width: 200, height: 60 };
  expect(pageFocus(parent, [child], viewport, .5)).toEqual({ x: 250, y: 30, zoom: .675 });
});
it('caps offsets and never zooms out for sprawling branches', () => {
  const children = Array.from({ length: 12 }, (_, i) => ({ position: { x: 10000, y: i * 10000 }, width: 200, height: 60 }));
  const focus = pageFocus(parent, children, viewport, .5);
  expect(focus.zoom).toBe(.5);
  expect((focus.x - 100) * focus.zoom).toBeLessThanOrEqual(viewport.width * PAGE_FOCUS.offsetX);
  expect((focus.y - 30) * focus.zoom).toBeLessThanOrEqual(viewport.height * PAGE_FOCUS.offsetY);
});
