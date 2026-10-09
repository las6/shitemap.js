'use client';

import { useEffect, useRef } from 'react';
import './CircuitSurface.css';

/** A flat varnish finish: only the reflection moves, never the routing. */
export default function CircuitSurface() {
  const surface = useRef(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer: fine)');
    let frame = 0;
    let current = { x: 0, y: 0 };
    let target = { x: 0, y: 0 };
    const paint = () => {
      current.x += (target.x - current.x) * 0.11;
      current.y += (target.y - current.y) * 0.11;
      surface.current?.style.setProperty('--reflection-x', `${current.x.toFixed(2)}%`);
      surface.current?.style.setProperty('--reflection-y', `${current.y.toFixed(2)}%`);
      frame = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.02
        ? requestAnimationFrame(paint) : 0;
    };
    const move = event => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
      target = { x: (event.clientX / window.innerWidth - 0.5) * 60,
        y: (event.clientY / window.innerHeight - 0.5) * 44 };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const reset = () => {
      target = { x: 0, y: 0 };
      if (reducedMotion.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        current = target;
        surface.current?.style.setProperty('--reflection-x', '0%');
        surface.current?.style.setProperty('--reflection-y', '0%');
      } else if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    reducedMotion.addEventListener('change', reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      reducedMotion.removeEventListener('change', reset);
    };
  }, []);

  return <div ref={surface} className="circuit-surface" aria-hidden="true">
    <div className="circuit-surface-finish" />
  </div>;
}
