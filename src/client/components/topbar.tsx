'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Home, LayoutDashboard, LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppPreferences } from '../providers/app-preferences-provider';
import { useAuth } from '../providers/auth-provider';
import { Button, buttonVariants } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { LocationModal, LocationTrigger } from './location-modal';
import { Grid } from './ui/grid';

// `icon` takes a rendered element (e.g. `<Search />`), not a component reference — that's what
// keeps it safe to pass from a Server Component consumer (RootLayout) across the client boundary.
export type TopbarNavLink = { href: string; label: string; icon?: ReactNode };

const softNavIconClass = 'shrink-0 text-muted-foreground/70 [&>svg]:h-[18px] [&>svg]:w-[18px]';
const softNavIconClassSm = 'shrink-0 text-muted-foreground/70 [&>svg]:h-4 [&>svg]:w-4';

export interface TopbarProps {
  /** Extra links rendered next to Home, both in the desktop nav and the mobile sheet. Default: []. */
  navLinks?: TopbarNavLink[];
  /** Shows the light/dark toggle button. Default: true — a consumer can turn it off if it drives theme another way. */
  showThemeToggle?: boolean;
  /**
   * 'split' renders separate Login / Sign up links (original behavior). 'single' renders one
   * emphasized primary "sign in" button instead (sign-up is still reachable from the login page).
   * Default: 'split'.
   */
  authCta?: 'split' | 'single';
  /** href for the single-CTA sign-in button. Default: '/login'. */
  loginHref?: string;
}

const navLinkClass =
  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[15px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground';

const mobileNavLinkClass =
  'flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground';

/**
 * Public-site top bar: brand dot + title, home / dashboard / custom links, location trigger,
 * auth actions and an optional light/dark toggle. Hidden on `/painel` routes (the panel has its
 * own chrome). Labels come from `useAppPreferences().messages`; everything else that a consumer
 * app might want to change (extra nav links, whether to show the theme toggle, how prominent the
 * sign-in action is) is a prop — see `TopbarProps`.
 */
export function Topbar({
  navLinks = [],
  showThemeToggle = true,
  authCta = 'split',
  loginHref = '/login',
}: TopbarProps = {}) {
  const pathname = usePathname();
  const [locationOpen, setLocationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { resolvedTheme, setTheme, messages } = useAppPreferences();
  const { user, logout } = useAuth();

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await logout();
    } finally {
      setLogoutLoading(false);
      setMenuOpen(false);
    }
  }

  if (pathname.startsWith('/painel')) {
    return null;
  }

  const allNavLinks: TopbarNavLink[] = [
    { href: '/', label: messages.nav.home, icon: <Home /> },
    ...navLinks,
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-sm">
        <Grid container containerSize="wide" padding="none">
          <Grid>
            <div className="mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-2.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="text-lg font-semibold tracking-tight">{messages.nav.title}</span>
              </Link>

              <nav className="hidden items-center gap-1 md:flex">
                {allNavLinks.map((link) => (
                  <Link key={link.href} className={navLinkClass} href={link.href}>
                    {link.icon && <span className={softNavIconClassSm}>{link.icon}</span>}
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <Link className={navLinkClass} href="/painel">
                    <span className={softNavIconClassSm}>
                      <LayoutDashboard />
                    </span>
                    {messages.default.dashboard}
                  </Link>
                )}
              </nav>

              <div className="hidden items-center gap-2 md:flex">
                <LocationTrigger onClick={() => setLocationOpen(true)} />

                {showThemeToggle && (
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
                )}

                {!user &&
                  (authCta === 'single' ? (
                    <Link
                      href={loginHref}
                      style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'h-9 gap-1.5 border-2 px-4 text-[15px] hover:bg-primary/10'
                      )}
                    >
                      <LogIn className="h-4 w-4" />
                      {messages.nav.signIn}
                    </Link>
                  ) : (
                    <>
                      <Link className={navLinkClass} href="/login">
                        {messages.nav.login}
                      </Link>
                      <Link className={navLinkClass} href="/registre-se">
                        {messages.nav.signUp}
                      </Link>
                    </>
                  ))}

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
              </div>

              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                aria-label={messages.nav.openMenu}
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </Grid>
        </Grid>
      </header>

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="top" className="flex flex-col p-0">
          <SheetHeader className="p-3">
            <SheetTitle>{messages.nav.title}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label={messages.nav.closeMenu}
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {allNavLinks.map((link) => (
              <Link
                key={link.href}
                className={mobileNavLinkClass}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.icon && <span className={softNavIconClass}>{link.icon}</span>}
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                className={mobileNavLinkClass}
                href="/painel"
                onClick={() => setMenuOpen(false)}
              >
                <span className={softNavIconClass}>
                  <LayoutDashboard />
                </span>
                {messages.default.dashboard}
              </Link>
            )}

            <div className="my-1 border-t border-border/70" />

            <div className="px-3">
              <LocationTrigger
                onClick={() => {
                  setMenuOpen(false);
                  setLocationOpen(true);
                }}
              />
            </div>

            {showThemeToggle && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={cn(mobileNavLinkClass, 'text-left')}
              >
                <span className={softNavIconClass}>
                  {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
                </span>
                {messages.nav.theme}
              </button>
            )}

            {!user &&
              (authCta === 'single' ? (
                <Link
                  href={loginHref}
                  onClick={() => setMenuOpen(false)}
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'mt-2 justify-center gap-1.5 border-2 text-[15px] hover:bg-primary/10'
                  )}
                >
                  <LogIn className="h-4 w-4" />
                  {messages.nav.signIn}
                </Link>
              ) : (
                <>
                  <Link
                    className={mobileNavLinkClass}
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                  >
                    {messages.nav.login}
                  </Link>
                  <Link
                    className={mobileNavLinkClass}
                    href="/registre-se"
                    onClick={() => setMenuOpen(false)}
                  >
                    {messages.nav.signUp}
                  </Link>
                </>
              ))}

            {user && (
              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={logoutLoading}
                className={cn(mobileNavLinkClass, 'h-auto justify-start')}
              >
                <span className={softNavIconClass}>
                  <LogOut />
                </span>
                {logoutLoading ? 'Saindo...' : 'Sair'}
              </Button>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
