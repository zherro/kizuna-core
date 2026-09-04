'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { useAppPreferences } from '../providers/app-preferences-provider';
import { useAuth } from '../providers/auth-provider';
import { Button } from './ui/button';
import { LocationModal, LocationTrigger } from './location-modal';
import { Grid } from './ui/grid';

/**
 * Public-site top bar: brand dot + title, home / dashboard links, location trigger,
 * auth actions (login/signup or logout) and a light/dark toggle. Hidden on `/painel`
 * routes (the panel has its own chrome). Labels come from `useAppPreferences().messages`.
 */
export function Topbar() {
  const pathname = usePathname();
  const [locationOpen, setLocationOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { resolvedTheme, setTheme, messages } = useAppPreferences();
  const { user, logout } = useAuth();

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
    }
  }

  if (pathname.startsWith('/painel')) {
    return null;
  }

  return (
    <>
      <header className="border-b border-border/70 bg-background/90">
        <Grid container containerSize="wide">
          <Grid>
            <div className="mx-auto flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold tracking-tight">{messages.nav.title}</span>
              </div>

              <nav className="flex items-justify gap-3">
                <Link
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  href="/"
                >
                  {messages.nav.home}
                </Link>
                {user && (
                  <Link
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    href="/painel"
                  >
                    {messages.default.dashboard}
                  </Link>
                )}
              </nav>

              <div className="hidden items-center gap-2 md:flex">
                <LocationTrigger onClick={() => setLocationOpen(true)} />

                {!user && (
                  <>
                    <Link
                      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      href="/login"
                    >
                      {messages.nav.login}
                    </Link>
                    <Link
                      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      href="/registre-se"
                    >
                      {messages.nav.signUp}
                    </Link>
                  </>
                )}
                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="h-auto px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    {logoutLoading ? 'Saindo...' : 'Sair'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={messages.nav.theme}
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label={messages.nav.openMenu}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </Grid>
        </Grid>
      </header>

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
    </>
  );
}
