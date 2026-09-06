'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Languages, MonitorCog, Moon, Sun } from 'lucide-react';
import { useAppPreferences } from '../providers/app-preferences-provider';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, } from './ui/dropdown-menu';
/**
 * Floating theme / accent-color / language switcher over the `account_preferences`
 * plugin (`useAppPreferences`). Generic — the option lists and labels come from the
 * provider's `messages` and theme model.
 */
export function PreferencesFab() {
    const { language, setLanguage, languageNames, languages, theme, setTheme, themeColor, setThemeColor, messages, } = useAppPreferences();
    return (_jsx("div", { className: "fixed right-4 bottom-4 z-50", children: _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", size: "icon", "aria-label": "Preferences", children: _jsx(MonitorCog, { className: "h-4 w-4" }) }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-56", children: [_jsx(DropdownMenuLabel, { children: messages.nav.theme }), _jsxs(DropdownMenuRadioGroup, { value: theme, onValueChange: (next) => setTheme(next), children: [_jsxs(DropdownMenuRadioItem, { value: "light", children: [_jsx(Sun, { className: "mr-2 h-4 w-4" }), messages.nav.light] }), _jsxs(DropdownMenuRadioItem, { value: "dark", children: [_jsx(Moon, { className: "mr-2 h-4 w-4" }), messages.nav.dark] }), _jsxs(DropdownMenuRadioItem, { value: "system", children: [_jsx(MonitorCog, { className: "mr-2 h-4 w-4" }), messages.nav.system] })] }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuLabel, { children: messages.nav.color }), _jsxs(DropdownMenuRadioGroup, { value: themeColor, onValueChange: (next) => setThemeColor(next), children: [_jsx(DropdownMenuRadioItem, { value: "blue", children: messages.nav.blue }), _jsx(DropdownMenuRadioItem, { value: "green", children: messages.nav.green }), _jsx(DropdownMenuRadioItem, { value: "purple", children: messages.nav.purple }), _jsx(DropdownMenuRadioItem, { value: "teal", children: messages.nav.teal }), _jsx(DropdownMenuRadioItem, { value: "red", children: messages.nav.red }), _jsx(DropdownMenuRadioItem, { value: "orange", children: messages.nav.orange }), _jsx(DropdownMenuRadioItem, { value: "coral", children: messages.nav.coral })] }), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuLabel, { children: messages.nav.language }), _jsx(DropdownMenuRadioGroup, { value: language, onValueChange: (next) => setLanguage(next), children: languages.map((item) => (_jsxs(DropdownMenuRadioItem, { value: item, children: [_jsx(Languages, { className: "mr-2 h-4 w-4" }), languageNames[item]] }, item))) })] })] }) }));
}
//# sourceMappingURL=preferences-fab.js.map