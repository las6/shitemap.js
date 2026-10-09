import { describe, expect, it } from 'vitest';
import { readViewSettings, writeViewSettings } from './viewSettings';

describe('shareable view settings', () => {
  it('round-trips nondefault settings while preserving source, other parameters and selected page', () => {
    const settings = { mode: 'bare', direction: 'vertical', detail: 'inspection' };
    const url = writeViewSettings('https://example.com/view/source?other=keep#page-42', settings);
    expect(readViewSettings(url.searchParams)).toEqual(settings);
    expect(url.pathname).toBe('/view/source');
    expect(url.searchParams.get('other')).toBe('keep');
    expect(url.hash).toBe('#page-42');
  });
  it('falls back for invalid shared values and omits defaults', () => {
    const defaults = { mode: 'regular', direction: 'horizontal', detail: 'auto' };
    expect(readViewSettings(new URLSearchParams('view=oops&direction=diagonal&detail=small'))).toEqual(defaults);
    expect(writeViewSettings('https://example.com/view/source?view=bare&direction=vertical&detail=inspection', defaults).search).toBe('');
  });
});
