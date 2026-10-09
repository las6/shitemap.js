import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTheme, setTheme, subscribeTheme, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from './theme';

afterEach(() => vi.unstubAllGlobals());

describe('theme preference', () => {
  it.each(['light', 'dark', 'system', 'invalid', null])('initializes before paint from saved %s', saved => {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(THEME_INIT_SCRIPT, { document, localStorage: { getItem: () => saved } });
    expect(document.documentElement.dataset.theme).toBe(['light', 'dark'].includes(saved) ? saved : 'system');
  });

  it('defaults to system when storage is unavailable', () => {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(THEME_INIT_SCRIPT, { document, localStorage: { getItem: () => { throw new Error('blocked'); } } });
    expect(document.documentElement.dataset.theme).toBe('system');
  });

  it('updates subscribers and the current theme even when saving fails', () => {
    vi.stubGlobal('document', { documentElement: { dataset: { theme: 'system' } } });
    const window = new EventTarget();
    window.localStorage = { setItem: vi.fn(() => { throw new Error('blocked'); }) };
    vi.stubGlobal('window', window);
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    setTheme('dark');
    expect(getTheme()).toBe('dark');
    expect(window.localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    setTheme('light');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('syncs preference changes and clears across tabs while ignoring other keys', () => {
    vi.stubGlobal('document', { documentElement: { dataset: { theme: 'light' } } });
    const window = new EventTarget();
    vi.stubGlobal('window', window);
    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);
    const storage = (key, newValue) => window.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));
    storage('other', 'dark');
    expect(getTheme()).toBe('light');
    storage(THEME_STORAGE_KEY, 'dark');
    expect(getTheme()).toBe('dark');
    storage(null, null);
    expect(getTheme()).toBe('system');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
