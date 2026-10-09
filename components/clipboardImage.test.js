import { describe, it, expect, vi } from 'vitest';
import { writePngClipboard } from './clipboardImage';
class Item {
  constructor(data) { this.data = data; }
  static supports(type) { return type === 'image/png'; }
}
describe('image clipboard', () => {
  it('starts the clipboard write before rendering awaits, and writes the PNG blob', async () => {
    const result = { blob: new Blob(['png'], { type: 'image/png' }), width: 200, height: 100 };
    let started = false;
    const render = vi.fn(async () => { expect(started).toBe(true); return result; });
    const write = vi.fn(async ([item]) => { started = true; expect(await item.data['image/png']).toBe(result.blob); });
    expect(await writePngClipboard(render, { write }, Item)).toBe(result);
    expect(render).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();
  });
  it('does not render when image clipboard support is missing', async () => {
    const render = vi.fn();
    await expect(writePngClipboard(render, {}, Item)).rejects.toThrow('Download PNG instead');
    expect(render).not.toHaveBeenCalled();
  });
  it('gives download guidance when clipboard access is denied', async () => {
    const write = vi.fn(() => Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })));
    await expect(writePngClipboard(async () => ({ blob: new Blob() }), { write }, Item)).rejects.toThrow('Clipboard access was blocked');
  });
  it('preserves rendering failures without falsely reporting a successful copy', async () => {
    const write = async ([item]) => { await item.data['image/png']; };
    await expect(writePngClipboard(async () => { throw new Error('Collapse branches'); }, { write }, Item)).rejects.toThrow('Collapse branches');
  });
});
