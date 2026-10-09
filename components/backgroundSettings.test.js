import { describe, expect, it } from 'vitest';
import { BACKGROUND_DEFAULTS, normalizeBackground } from './backgroundSettings';

describe('background preferences', () => {
  it('keeps the map clear by default and preserves explicit experiment choices', () => {
    expect(normalizeBackground()).toEqual(BACKGROUND_DEFAULTS);
    expect(normalizeBackground({ texture: 'grain', mapEnabled: true, visibility: 150, contrast: 35, isometric: true, debug: true })).toEqual({ texture: 'grain', mapEnabled: true, visibility: 150, contrast: 35, isometric: true, debug: true });
  });
  it('sanitizes persisted values and bounds intensity', () => {
    expect(normalizeBackground({ texture: 'unknown', mapEnabled: 'true', visibility: -10 })).toEqual({ ...BACKGROUND_DEFAULTS, visibility: 0 });
    expect(normalizeBackground({ visibility: 999 }).visibility).toBe(200);
    expect(normalizeBackground({ visibility: '150' }).visibility).toBe(100);
    expect(normalizeBackground({ contrast: 999 }).contrast).toBe(100);
    expect(normalizeBackground({ contrast: -1 }).contrast).toBe(0);
    expect(normalizeBackground({ contrast: 'bright' }).contrast).toBe(35);
  });
});
