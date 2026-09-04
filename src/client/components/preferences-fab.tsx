'use client';

import { Languages, MonitorCog, Moon, Sun } from 'lucide-react';
import { useAppPreferences } from '../providers/app-preferences-provider';
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
            <DropdownMenuRadioItem value="blue">{messages.nav.blue}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="green">{messages.nav.green}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="purple">{messages.nav.purple}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="teal">{messages.nav.teal}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="red">{messages.nav.red}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="orange">{messages.nav.orange}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="coral">{messages.nav.coral}</DropdownMenuRadioItem>
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
