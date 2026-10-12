'use client';

import { useEffect, useState } from 'react';

export default function usePageMetadata(client, target) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(null);
  const [clock, setClock] = useState(Date.now);
  const current = state?.target === target && state.attempt === attempt ? state.result : null;
  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      client.load(target, controller.signal).then(result => {
        if (!controller.signal.aborted) { setState({ target, attempt, result }); setClock(Date.now()); }
      }).catch(() => {});
    }, client.peek(target) ? 0 : 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [target, client, attempt]);
  const retryAt = current?.retryAt;
  useEffect(() => {
    if (!retryAt || retryAt <= Date.now()) return;
    const timer = setTimeout(() => setClock(Date.now()), retryAt - Date.now() + 10);
    return () => clearTimeout(timer);
  }, [retryAt, clock]);
  return { result: current, retryBlocked: Boolean(retryAt && retryAt > clock), retry: () => setAttempt(value => value + 1) };
}
