export const THEME_STORAGE_KEY = 'shitemap-theme';
export const THEMES = ['system', 'light', 'dark'];

export function normalizeTheme(value) {
  return THEMES.includes(value) ? value : 'system';
}

// Run before paint so a saved preference is also used on the first frame.
export const THEME_INIT_SCRIPT = `(() => {
  let theme = 'system';
  try {
    const saved = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (${JSON.stringify(THEMES)}.includes(saved)) theme = saved;
  } catch {}
  document.documentElement.dataset.theme = theme;
})();`;

export function getTheme() {
  return normalizeTheme(document.documentElement.dataset.theme);
}

export function setTheme(value) {
  const theme = normalizeTheme(value);
  document.documentElement.dataset.theme = theme;
  try { window.localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
  window.dispatchEvent(new Event('shitemap-theme-change'));
}

export function subscribeTheme(listener) {
  const syncStorage = event => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    document.documentElement.dataset.theme = normalizeTheme(event.newValue);
    listener();
  };
  window.addEventListener('shitemap-theme-change', listener);
  window.addEventListener('storage', syncStorage);
  return () => {
    window.removeEventListener('shitemap-theme-change', listener);
    window.removeEventListener('storage', syncStorage);
  };
}
