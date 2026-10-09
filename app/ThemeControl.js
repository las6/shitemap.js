'use client';

import { useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribeTheme, THEMES } from '../components/theme';
import './ThemeControl.css';

const serverTheme = () => 'system';

export default function ThemeControl() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, serverTheme);
  return <fieldset className="theme-control">
    <legend>Theme</legend>
    <div className="theme-segments">
      {THEMES.map(value => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
    </div>
  </fieldset>;
}
