'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Languages, MonitorCog, Moon, Sun } from 'lucide-react';
import { useAppPreferences, THEME_COLORS } from '../providers/app-preferences-provider';
const COLOR_FALLBACK_LABEL = {
    terracotta: 'Terracota',
};
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, } from './ui/dropdown-menu';
/**
 * Floating theme / accent-color / language switcher over the `account_preferences`
 * plugin (`useAppPreferences`). Generic — the option lists and labels come from the
 * provider's `messages` and theme model.
 */
export function PreferencesFab() {
    const { language, setLanguage, languageNames, languages, theme, setTheme, themeColor, setThemeColor, messages, } = useAppPreferences();
    return (_jsx("div", { className: "fixed right-4 bottom-4 z-50", children: _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", size: "icon", "aria-label": "Preferences", children: _jsx(MonitorCog, { className: "h-4 w-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [_jsx(DropdownMenuLabel, { children: messages.nav.theme }), _jsxs(DropdownMenuRadioGroup, { value: theme, onValueChange: (next) => setTheme(next), children: [_jsxs(DropdownMenuRadioItem, { value: "light", children: [_jsx(Sun, { className: "mr-2 h-4 w-4" }), messages.nav.light] }), _jsxs(DropdownMenuRadioItem, { value: "dark", children: [_jsx(Moon, { className: "mr-2 h-4 w-4" }), messages.nav.dark] }), _jsxs(DropdownMenuRadioItem, { value: "system", children: [_jsx(MonitorCog, { className: "mr-2 h-4 w-4" }), messages.nav.system] })] }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuLabel, { children: messages.nav.color }), _jsx(DropdownMenuRadioGroup, { value: themeColor, onValueChange: (next) => setThemeColor(next), children: THEME_COLORS.map((c) => (_jsx(DropdownMenuRadioItem, { value: c, children: messages.nav[c] ??
                                    COLOR_FALLBACK_LABEL[c] ??
                                    c.charAt(0).toUpperCase() + c.slice(1) }, c))) }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuLabel, { children: messages.nav.language }), _jsx(DropdownMenuRadioGroup, { value: language, onValueChange: (next) => setLanguage(next), children: languages.map((item) => (_jsxs(DropdownMenuRadioItem, { value: item, children: [_jsx(Languages, { className: "mr-2 h-4 w-4" }), languageNames[item]] }, item))) })] })] }) }));
}
//# sourceMappingURL=preferences-fab.js.map