'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import BackgroundControls from './BackgroundControls';
import ThemeControl from './ThemeControl';

export default function LandingAppearance() {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const button = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const keyboard = event => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    root.current?.querySelector('.landing-appearance-panel button')?.focus();
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
  }, [open]);
  return <div className="landing-appearance" ref={root}>
    <button ref={button} type="button" aria-expanded={open} aria-controls="landing-appearance-panel" onClick={() => setOpen(!open)}><Icon name="sliders-horizontal" size={16} />Appearance</button>
    {open && <div id="landing-appearance-panel" className="landing-appearance-panel" aria-label="Appearance settings"><ThemeControl /><BackgroundControls /></div>}
  </div>;
}
