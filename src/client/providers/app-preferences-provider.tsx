'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  languages,
  languageNames,
  messages,
  type AppLanguage,
  type AppMessages,
} from '@/i18n/messages';
import { isThemeColor, THEME_COLORS, type AppThemeColor } from '../../shared/theme-colors';

export { isThemeColor, THEME_COLORS, type AppThemeColor };

type AppTheme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

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
  /** `false` = cor fixa em `defaultThemeColor`; o seletor de cor some do PreferencesFab. */
  themeColorSelectable: boolean;
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

function parseThemeColor(value: string | null, fallback: AppThemeColor): AppThemeColor {
  return isThemeColor(value) ? value : fallback;
}

type AppPreferencesProviderProps = {
  children: React.ReactNode;
  /** Cor usada enquanto o usuário não escolheu outra (ou sempre, se `themeColorSelectable` for false). */
  defaultThemeColor?: AppThemeColor;
  /** Permite ao usuário trocar a cor. Default: true. */
  themeColorSelectable?: boolean;
};

export function AppPreferencesProvider({
  children,
  defaultThemeColor = 'blue',
  themeColorSelectable = true,
}: AppPreferencesProviderProps) {
  const [language, setLanguage] = useState<AppLanguage>('pt-BR');
  const [theme, setTheme] = useState<AppTheme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [themeColor, setThemeColorState] = useState<AppThemeColor>(defaultThemeColor);
  const setThemeColor = useCallback(
    (next: AppThemeColor) => {
      if (themeColorSelectable) setThemeColorState(next);
    },
    [themeColorSelectable],
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedLanguage = parseLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    const savedTheme = parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    const savedThemeColor = themeColorSelectable
      ? parseThemeColor(window.localStorage.getItem(THEME_COLOR_STORAGE_KEY), defaultThemeColor)
      : defaultThemeColor;
    const nextResolvedTheme = savedTheme === 'system' ? getSystemTheme() : savedTheme;

    queueMicrotask(() => {
      setLanguage(savedLanguage);
      setTheme(savedTheme);
      setResolvedTheme(nextResolvedTheme);
      setThemeColorState(savedThemeColor);
      setHydrated(true);
    });

    document.documentElement.classList.toggle('dark', nextResolvedTheme === 'dark');
    document.documentElement.lang = savedLanguage;
    document.documentElement.setAttribute('data-theme-color', savedThemeColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lido uma vez, na montagem
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [hydrated, language]);

  useEffect(() => {
    if (!hydrated) return;
    if (themeColorSelectable) window.localStorage.setItem(THEME_COLOR_STORAGE_KEY, themeColor);
    document.documentElement.setAttribute('data-theme-color', themeColor);
  }, [hydrated, themeColor, themeColorSelectable]);

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
      themeColorSelectable,
      languages,
      languageNames,
      messages: messages[language],
    }),
    [language, theme, resolvedTheme, themeColor, setThemeColor, themeColorSelectable]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return ctx;
}
