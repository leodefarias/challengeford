import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, ColorScheme } from './index';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ColorScheme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: DarkColors,
  toggle: () => {},
});

const STORAGE_KEY = 'theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  const toggle = useCallback(() => {
    setMode(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const colors = mode === 'dark' ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
