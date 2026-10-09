export const BACKGROUND_DEFAULTS = Object.freeze({ texture: 'circuit', mapEnabled: false, visibility: 100, contrast: 35, isometric: false, debug: false });
const KEY = 'shitemap-background';
const EVENT = 'shitemap-background-change';
let cachedRaw;
let cached = BACKGROUND_DEFAULTS;

export function normalizeBackground(value = {}) {
  return {
    texture: ['off', 'grain', 'circuit', 'sparse'].includes(value.texture) ? value.texture : 'circuit',
    mapEnabled: value.mapEnabled === true,
    visibility: Number.isFinite(value.visibility) ? Math.max(0, Math.min(200, value.visibility)) : 100,
    contrast: Number.isFinite(value.contrast) ? Math.max(0, Math.min(100, value.contrast)) : 35,
    isometric: value.isometric === true,
    debug: value.debug === true,
  };
}
export function getBackgroundSettings() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { return cached; }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try { cached = normalizeBackground(JSON.parse(raw) || {}); } catch { cached = BACKGROUND_DEFAULTS; }
  }
  return cached;
}
export function updateBackgroundSetting(key, value) {
  cached = normalizeBackground({ ...getBackgroundSettings(), [key]: value });
  cachedRaw = JSON.stringify(cached);
  try { localStorage.setItem(KEY, cachedRaw); } catch {}
  window.dispatchEvent(new Event(EVENT));
}
export function subscribeBackground(listener) {
  const storage = event => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', storage); };
}
