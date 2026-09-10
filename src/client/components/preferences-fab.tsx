'use client';

import { Languages, MonitorCog, Moon, Sun } from 'lucide-react';
import { useAppPreferences, THEME_COLORS } from '../providers/app-preferences-provider';

const COLOR_FALLBACK_LABEL: Record<string, string> = {
  terracotta: 'Terracota',
};
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

/**
 * Floating theme / accent-color / language switcher over the `account_preferences`
 * plugin (`useAppPreferences`). Generic — the option lists and labels come from the
 * provider's `messages` and theme model.
 */
export function PreferencesFab() {
  const {
    language,
    setLanguage,
    languageNames,
    languages,
    theme,
    setTheme,
    themeColor,
    setThemeColor,
    messages,
  } = useAppPreferences();

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Preferences">
            <MonitorCog className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{messages.nav.theme}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(next) => setTheme(next as typeof theme)}
          >
            <DropdownMenuRadioItem value="light">
              <Sun className="mr-2 h-4 w-4" />
              {messages.nav.light}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="mr-2 h-4 w-4" />
              {messages.nav.dark}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <MonitorCog className="mr-2 h-4 w-4" />
              {messages.nav.system}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>{messages.nav.color}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={themeColor}
            onValueChange={(next) => setThemeColor(next as typeof themeColor)}
          >
            {THEME_COLORS.map((c) => (
              <DropdownMenuRadioItem key={c} value={c}>
                {(messages.nav as Record<string, string>)[c] ??
                  COLOR_FALLBACK_LABEL[c] ??
                  c.charAt(0).toUpperCase() + c.slice(1)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>{messages.nav.language}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={language}
            onValueChange={(next) => setLanguage(next as typeof language)}
          >
            {languages.map((item) => (
              <DropdownMenuRadioItem key={item} value={item}>
                <Languages className="mr-2 h-4 w-4" />
                {languageNames[item]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
