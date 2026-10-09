'use client';

import { useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribeTheme, THEMES } from '../components/theme';
import './ThemeControl.css';
import Icon from '../components/Icon';

const serverTheme = () => 'system';

export default function ThemeControl() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, serverTheme);
  return <fieldset className="theme-control">
    <legend><Icon name="sun" size={14} />Theme</legend>
    <div className="theme-segments">
      {THEMES.map(value => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
    </div>
  </fieldset>;
}
