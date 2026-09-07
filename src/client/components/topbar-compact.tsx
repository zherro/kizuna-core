'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogIn, LogOut, MapPin, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppPreferences } from '../providers/app-preferences-provider';
import { useAuth } from '../providers/auth-provider';
import { Button, buttonVariants } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import type { TopbarNavLink } from './topbar';

export type TopbarCompactProps = {
  navLinks?: TopbarNavLink[];
  authCta?: 'split' | 'single';
  loginHref?: string;
  showThemeToggle?: boolean;
  /** Linha pequena acima do label (ex.: "Você está em"). */
  eyebrow?: string;
  /** Label da marca/localização (ex.: "Centro, sua cidade"). */
  brandLabel?: string;
  /** href do botão de busca. Se ausente, o botão não aparece. */
  searchHref?: string;
};

/**
 * Cabeçalho compacto — variante do `Topbar`. Marca curta com pino, nav central,
 * botão de busca redondo. Mesmas props de nav/auth do `Topbar`; some em `/painel`.
 * Todo tokenizado (troca de tema/cor afeta igual).
 */
export function TopbarCompact({
  navLinks = [],
  authCta = 'single',
  loginHref = '/login',
  showThemeToggle = true,
  eyebrow = 'Você está em',
  brandLabel = 'Início',
  searchHref = '/busca',
}: TopbarCompactProps = {}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { resolvedTheme, setTheme, messages } = useAppPreferences();
  const { user, logout } = useAuth();

  if (pathname.startsWith('/painel')) return null;

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
      setMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 flex-col leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </span>
          <span className="flex items-center gap-1 truncate text-sm font-bold text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {brandLabel}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {showThemeToggle && (
            <button
              type="button"
              aria-label={messages.nav.theme}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {searchHref && (
            <Link
              href={searchHref}
              aria-label="Buscar"
              className="hidden h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground md:flex"
            >
              <Search className="h-4 w-4" />
            </Link>
          )}

          {!user &&
            (authCta === 'single' ? (
              <Link
                href={loginHref}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'hidden h-9 gap-1.5 border-2 border-primary px-4 text-sm text-primary hover:bg-primary/10 md:inline-flex'
                )}
              >
                <LogIn className="h-4 w-4" />
                {messages.nav.signIn}
              </Link>
            ) : (
              <div className="hidden items-center gap-3 md:flex">
                <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" href="/login">
                  {messages.nav.login}
                </Link>
                <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" href="/registre-se">
                  {messages.nav.signUp}
                </Link>
              </div>
            ))}

          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="hidden h-9 px-3 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
            >
              {logoutLoading ? 'Saindo...' : 'Sair'}
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 md:hidden"
            aria-label={messages.nav.openMenu}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle>{messages.nav.openMenu}</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            {searchHref && (
              <Link
                href={searchHref}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Search className="h-4 w-4" /> Buscar
              </Link>
            )}
            <div className="my-2 border-t border-border" />
            {!user ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <LogIn className="h-4 w-4" /> {messages.nav.login}
                </Link>
                <Link
                  href="/registre-se"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {messages.nav.signUp}
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" /> {logoutLoading ? 'Saindo...' : 'Sair'}
              </button>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
