import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ThemeConfig } from '../types';
import { DEFAULT_THEME, THEME_PRESETS } from '../types';
import { loadTheme as dbLoadTheme, saveTheme as dbSaveTheme } from '../db/database';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    dbLoadTheme().then((t) => {
      setTheme(t);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    const isDark = theme.themeId === 'dark';
    root.className = isDark ? 'theme-dark' : '';

    root.style.setProperty('--blur-amount', `${theme.blurAmount}px`);
    root.style.setProperty('--bg-opacity', String(theme.backgroundOpacity));
    root.style.setProperty('--accent-color', theme.accentColor);

    if (theme.customBgPath) {
      invoke<string>('load_image_data_url', { path: theme.customBgPath })
        .then((dataUrl) => {
          document.body.style.backgroundImage = `url(${dataUrl})`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundRepeat = 'no-repeat';
        })
        .catch(() => {
          document.body.style.backgroundImage = '';
        });
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
    }

    dbSaveTheme(theme);
  }, [theme, loaded]);

  const updateTheme = useCallback((partial: Partial<ThemeConfig>) => {
    setTheme((prev) => {
      const next = { ...prev, ...partial };
      if (partial.themeId && partial.themeId === 'light' || partial.themeId === 'dark') {
        const preset = THEME_PRESETS[partial.themeId];
        if (preset) {
          return { ...next, blurAmount: preset.blurAmount, backgroundOpacity: preset.backgroundOpacity, accentColor: preset.accentColor, customBgPath: undefined };
        }
      }
      if (partial.customBgPath) {
        next.themeId = 'custom';
      }
      return next;
    });
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    updateTheme({ themeId: presetId as ThemeConfig['themeId'] });
  }, [updateTheme]);

  return { theme, updateTheme, applyPreset, loaded };
}
