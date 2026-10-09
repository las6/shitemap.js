import { describe, it, expect } from 'vitest';
import { exportSize, exportFilename, mapSvg, EXPORT_LIMITS, xml } from './mapExport';
describe('map export', () => {
  it('bounds raster dimensions and pixels without cropping the aspect ratio', () => {
    for (const bounds of [{ width: 30000, height: 40000 }, { width: 100000, height: 500 }, { width: 600, height: 300 }]) {
      const size = exportSize(bounds, 'png');
      expect(size.pixelWidth).toBeLessThanOrEqual(EXPORT_LIMITS.side);
      expect(size.pixelHeight).toBeLessThanOrEqual(EXPORT_LIMITS.side);
      expect(size.pixelWidth * size.pixelHeight).toBeLessThanOrEqual(EXPORT_LIMITS.pixels);
      expect(Math.abs(size.pixelWidth - size.width * size.scale)).toBeLessThan(1);
      expect(Math.abs(size.pixelHeight - size.height * size.scale)).toBeLessThan(1);
    }
  });
  it('keeps SVG full resolution and rejects invalid geometry', () => {
    expect(exportSize({ width: 20000, height: 10000 }, 'svg').scale).toBe(1);
    expect(() => exportSize({ width: NaN, height: 1 }, 'png')).toThrow();
  });
  it('exports native escaped vector text, paths, and optional background', () => {
    const map = { bounds: { x: -50, y: 20, width: 500, height: 200 }, background: '#fff', shapes: [], paths: [{ d: 'M 0 0 H 50', color: '#aaa', width: 1 }], texts: [{ x: 1, y: 2, size: 18, family: 'Recursive', weight: 500, color: '#333', text: '<script> & "hi"' }] };
    const result = mapSvg(map, false);
    expect(result).toContain('translate(98 28)');
    expect(result).toContain('&lt;script&gt; &amp; &quot;hi&quot;');
    expect(result).not.toContain('<foreignObject');
    expect(result).not.toContain('<rect');
    expect(mapSvg(map, true)).toContain('fill="#fff"');
  });
  it('replaces XML-forbidden controls and unpaired surrogate text', () => {
    expect(xml('a\u0000b\ud800')).toBe('a\ufffdb\ufffd');
  });
  it('uses the public hostname rather than source query/path in filenames', () => expect(exportFilename('https://example.com/private.xml?secret=value', 'svg')).toBe('example.com-sitemap.svg'));
});
