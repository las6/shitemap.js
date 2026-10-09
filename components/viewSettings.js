// URL values are a public sharing format; internal layout names stay separate.
export const VIEW_SETTINGS = {
  mode: { param: 'view', default: 'regular', values: ['regular', 'bare'] },
  direction: { param: 'direction', default: 'horizontal', values: ['horizontal', 'vertical'] },
  detail: { param: 'detail', default: 'auto', values: ['auto', 'overview', 'inspection'] },
};
export function readViewSettings(params) {
  return Object.fromEntries(Object.entries(VIEW_SETTINGS).map(([key, setting]) => {
    const value = params.get(setting.param);
    return [key, setting.values.includes(value) ? value : setting.default];
  }));
}
export function writeViewSettings(url, settings) {
  const next = new URL(url);
  for (const [key, setting] of Object.entries(VIEW_SETTINGS)) {
    const value = settings[key];
    if (setting.values.includes(value) && value !== setting.default) next.searchParams.set(setting.param, value);
    else next.searchParams.delete(setting.param);
  }
  return next;
}
