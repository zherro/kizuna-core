'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  languages,
  languageNames,
  messages,
  type AppLanguage,
  type AppMessages,
} from '@/i18n/messages';

type AppTheme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
export type AppThemeColor = 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'orange' | 'coral';

const LANGUAGE_STORAGE_KEY = 'foco-total-language';
const THEME_STORAGE_KEY = 'foco-total-theme';
const THEME_COLOR_STORAGE_KEY = 'foco-total-theme-color';

type AppPreferencesContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  theme: AppTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: AppTheme) => void;
  themeColor: AppThemeColor;
  setThemeColor: (themeColor: AppThemeColor) => void;
  languages: readonly AppLanguage[];
  languageNames: Record<AppLanguage, string>;
  messages: AppMessages;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

function parseLanguage(value: string | null): AppLanguage {
  if (!value) return 'pt-BR';
  if (languages.includes(value as AppLanguage)) return value as AppLanguage;
  return 'pt-BR';
}

function parseTheme(value: string | null): AppTheme {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const THEME_COLORS: readonly AppThemeColor[] = [
  'blue',
  'green',
  'purple',
  'teal',
  'red',
  'orange',
  'coral',
];

function parseThemeColor(value: string | null): AppThemeColor {
  if (value && (THEME_COLORS as readonly string[]).includes(value)) {
    return value as AppThemeColor;
  }
  return 'blue';
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>('pt-BR');
  const [theme, setTheme] = useState<AppTheme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [themeColor, setThemeColor] = useState<AppThemeColor>('blue');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedLanguage = parseLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    const savedTheme = parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    const savedThemeColor = parseThemeColor(window.localStorage.getItem(THEME_COLOR_STORAGE_KEY));
    const nextResolvedTheme = savedTheme === 'system' ? getSystemTheme() : savedTheme;

    queueMicrotask(() => {
      setLanguage(savedLanguage);
      setTheme(savedTheme);
      setResolvedTheme(nextResolvedTheme);
      setThemeColor(savedThemeColor);
      setHydrated(true);
    });

    document.documentElement.classList.toggle('dark', nextResolvedTheme === 'dark');
    document.documentElement.lang = savedLanguage;
    document.documentElement.setAttribute('data-theme-color', savedThemeColor);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [hydrated, language]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(THEME_COLOR_STORAGE_KEY, themeColor);
    document.documentElement.setAttribute('data-theme-color', themeColor);
  }, [hydrated, themeColor]);

  useEffect(() => {
    if (!hydrated) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const nextResolved: ResolvedTheme = theme === 'system' ? getSystemTheme() : theme;
      setResolvedTheme(nextResolved);
      document.documentElement.classList.toggle('dark', nextResolved === 'dark');
    };

    const onMediaChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    applyTheme();
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    media.addEventListener('change', onMediaChange);

    return () => {
      media.removeEventListener('change', onMediaChange);
    };
  }, [hydrated, theme]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      language,
      setLanguage,
      theme,
      resolvedTheme,
      setTheme,
      themeColor,
      setThemeColor,
      languages,
      languageNames,
      messages: messages[language],
    }),
    [language, theme, resolvedTheme, themeColor]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return ctx;
}
