import { type AppLanguage, type AppMessages } from '@/i18n/messages';
type AppTheme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
export type AppThemeColor = 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'orange' | 'coral';
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
export declare function AppPreferencesProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAppPreferences(): AppPreferencesContextValue;
export {};
//# sourceMappingURL=app-preferences-provider.d.ts.map