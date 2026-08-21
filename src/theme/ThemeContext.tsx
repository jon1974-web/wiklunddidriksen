import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors, slateGrayColors, dustyRoseColors,
  schoolColors, kindergartenColors, tripsColors, birthdaysColors,
  petsColors, mealsColors, healthColors, darkColors, Colors
} from './colors';

type ThemeMode = 'light' | 'dark' | 'system' | 'slategray' | 'dustyrose' | 'school' | 'kindergarten' | 'trips' | 'birthdays' | 'pets' | 'meals' | 'health';

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

const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system', 'slategray', 'dustyrose', 'school', 'kindergarten', 'trips', 'birthdays', 'pets', 'meals', 'health'];

function getStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem('themeMode');
    if (stored && VALID_MODES.includes(stored as ThemeMode)) {
      return stored as ThemeMode;
    }
  } catch {}
  return 'slategray';
}

function storeMode(mode: ThemeMode) {
  try { localStorage.setItem('themeMode', mode); } catch {}
}

function resolveColors(mode: ThemeMode, systemScheme: string | null | undefined): { colors: Colors; isDark: boolean } {
  if (mode === 'slategray') return { colors: slateGrayColors, isDark: false };
  if (mode === 'dustyrose') return { colors: dustyRoseColors, isDark: false };
  if (mode === 'school') return { colors: schoolColors, isDark: false };
  if (mode === 'kindergarten') return { colors: kindergartenColors, isDark: false };
  if (mode === 'trips') return { colors: tripsColors, isDark: false };
  if (mode === 'birthdays') return { colors: birthdaysColors, isDark: false };
  if (mode === 'pets') return { colors: petsColors, isDark: false };
  if (mode === 'meals') return { colors: mealsColors, isDark: false };
  if (mode === 'health') return { colors: healthColors, isDark: false };
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
