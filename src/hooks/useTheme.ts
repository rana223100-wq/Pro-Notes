import { useEffect, useState, useCallback } from 'react';
import { storage } from '@/lib/storage';
import type { ThemePref } from '@/types';

function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = pref === 'dark' || (pref === 'system' && sysDark);
  root.classList.toggle('dark', dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>(() => storage.loadTheme());

  useEffect(() => {
    applyTheme(theme);
    storage.saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: ThemePref) => setThemeState(t), []);
  return { theme, setTheme };
}
