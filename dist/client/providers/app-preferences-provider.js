'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { languages, languageNames, messages, } from '@/i18n/messages';
const LANGUAGE_STORAGE_KEY = 'foco-total-language';
const THEME_STORAGE_KEY = 'foco-total-theme';
const THEME_COLOR_STORAGE_KEY = 'foco-total-theme-color';
const AppPreferencesContext = createContext(null);
function parseLanguage(value) {
    if (!value)
        return 'pt-BR';
    if (languages.includes(value))
        return value;
    return 'pt-BR';
}
function parseTheme(value) {
    if (value === 'light' || value === 'dark' || value === 'system')
        return value;
    return 'system';
}
function getSystemTheme() {
    if (typeof window === 'undefined')
        return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export const THEME_COLORS = [
    'blue',
    'green',
    'purple',
    'teal',
    'red',
    'orange',
    'coral',
    'terracotta',
];
function parseThemeColor(value) {
    if (value && THEME_COLORS.includes(value)) {
        return value;
    }
    return 'blue';
}
export function AppPreferencesProvider({ children }) {
    const [language, setLanguage] = useState('pt-BR');
    const [theme, setTheme] = useState('system');
    const [resolvedTheme, setResolvedTheme] = useState('light');
    const [themeColor, setThemeColor] = useState('blue');
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
        if (!hydrated)
            return;
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        document.documentElement.lang = language;
    }, [hydrated, language]);
    useEffect(() => {
        if (!hydrated)
            return;
        window.localStorage.setItem(THEME_COLOR_STORAGE_KEY, themeColor);
        document.documentElement.setAttribute('data-theme-color', themeColor);
    }, [hydrated, themeColor]);
    useEffect(() => {
        if (!hydrated)
            return;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const applyTheme = () => {
            const nextResolved = theme === 'system' ? getSystemTheme() : theme;
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
    const value = useMemo(() => ({
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
    }), [language, theme, resolvedTheme, themeColor]);
    return _jsx(AppPreferencesContext.Provider, { value: value, children: children });
}
export function useAppPreferences() {
    const ctx = useContext(AppPreferencesContext);
    if (!ctx)
        throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
    return ctx;
}
//# sourceMappingURL=app-preferences-provider.js.map