"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// 테마 컬러 시스템
export const themes = {
  dark: {
    bgMain: '#252529',
    bgCard: '#1E1E1E',
    bgCardHover: '#252525',
    bgElevated: '#2A2A2A',
    bgInput: '#252525',
    textPrimary: '#D0D0D0',
    textSecondary: '#9A9A9A',
    textMuted: '#707070',
    accent: '#D4A574',
    accentLight: '#E8C9A0',
    accentDark: '#B8956A',
    border: '#333333',
    borderLight: '#2A2A2A',
    red: '#E57373',
    redBg: 'rgba(229, 115, 115, 0.2)',
    success: '#81C784',
    successBg: 'rgba(129, 199, 132, 0.2)',
    btnPrimary: '#D4A574',
    btnPrimaryText: '#121212',
    btnSecondary: '#252525',
    btnSecondaryText: '#D0D0D0',
  },
  light: {
    bgMain: '#F5F0EB',
    bgCard: '#FFFFFF',
    bgCardHover: '#FAFAFA',
    bgElevated: '#FFFFFF',
    bgInput: '#F7F7F7',
    textPrimary: '#2D2D2D',
    textSecondary: '#666666',
    textMuted: '#999999',
    accent: '#B8956A',
    accentLight: '#D4A574',
    accentDark: '#9A7B5A',
    border: '#E5E5E5',
    borderLight: '#EEEEEE',
    red: '#E53935',
    redBg: 'rgba(229, 57, 53, 0.1)',
    success: '#43A047',
    successBg: 'rgba(67, 160, 71, 0.1)',
    btnPrimary: '#B8956A',
    btnPrimaryText: '#FFFFFF',
    btnSecondary: '#F0F0F0',
    btnSecondaryText: '#2D2D2D',
  }
};

export type Theme = typeof themes.dark;
export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      setIsDark(saved === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('theme');
      if (!saved) {
        setIsDark(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const setTheme = (mode: ThemeMode) => {
    setIsDark(mode === 'dark');
    localStorage.setItem('theme', mode);
  };

  const theme = isDark ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
