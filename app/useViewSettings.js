'use client';

import { useCallback, useEffect, useState } from 'react';
import { readViewSettings, writeViewSettings } from '../components/viewSettings';

export default function useViewSettings() {
  const [settings, setSettings] = useState(() => readViewSettings(new URLSearchParams()));
  useEffect(() => {
    const sync = () => setSettings(readViewSettings(new URLSearchParams(window.location.search)));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const update = useCallback((key, value) => {
    const currentUrl = new URL(window.location.href);
    const next = { ...readViewSettings(currentUrl.searchParams), [key]: value };
    const url = writeViewSettings(currentUrl, next);
    // Editing presentation shouldn't add a Back-button stop for each choice.
    window.history.replaceState(window.history.state, '', url);
    setSettings(readViewSettings(url.searchParams));
  }, []);
  return [settings, update];
}
