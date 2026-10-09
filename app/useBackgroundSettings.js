'use client';

import { useSyncExternalStore } from 'react';
import { BACKGROUND_DEFAULTS, getBackgroundSettings, subscribeBackground, updateBackgroundSetting } from '../components/backgroundSettings';
const serverSnapshot = () => BACKGROUND_DEFAULTS;
export default function useBackgroundSettings() {
  return [useSyncExternalStore(subscribeBackground, getBackgroundSettings, serverSnapshot), updateBackgroundSetting];
}
