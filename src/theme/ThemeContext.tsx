import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, orangeColors, deepBlueColors, silverColors, purpleColors, pinkColors, tealColors, darkTealColors, Colors } from './colors';

type ThemeMode = 'light' | 'dark' | 'system' | 'orange' | 'deepblue' | 'silver' | 'purple' | 'pink' | 'teal' | 'darkteal';

interface ThemeContextValue {
  colors: Colors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  mode: 'system',
  isDark: false,
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem('themeMode');
    if (stored && ['light', 'dark', 'system', 'orange', 'deepblue', 'silver', 'purple', 'pink', 'teal', 'darkteal'].includes(stored)) {
      return stored as ThemeMode;
    }
  } catch {}
  return 'teal';
}

function storeMode(mode: ThemeMode) {
  try { localStorage.setItem('themeMode', mode); } catch {}
}

function resolveColors(mode: ThemeMode, systemScheme: string | null | undefined): { colors: Colors; isDark: boolean } {
  if (mode === 'orange') return { colors: orangeColors, isDark: false };
  if (mode === 'deepblue') return { colors: deepBlueColors, isDark: false };
  if (mode === 'silver') return { colors: silverColors, isDark: false };
  if (mode === 'purple') return { colors: purpleColors, isDark: false };
  if (mode === 'pink') return { colors: pinkColors, isDark: false };
  if (mode === 'teal') return { colors: tealColors, isDark: false };
  if (mode === 'darkteal') return { colors: darkTealColors, isDark: false };
  if (mode === 'dark') return { colors: darkColors, isDark: true };
  if (mode === 'light') return { colors: lightColors, isDark: false };
  // system
  const isDark = systemScheme === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);

  const { colors, isDark } = resolveColors(mode, systemScheme);

  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    storeMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ colors, mode, isDark, setMode: handleSetMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
