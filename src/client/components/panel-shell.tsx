'use client';

import Link from 'next/link';
import { notFound, usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { useAuth } from '../providers/auth-provider';
import { cn } from '../../lib/utils';

export type PanelNavIcon = ComponentType<{ className?: string }>;

export type PanelNavItem = {
  title: string;
  href: string;
  icon: PanelNavIcon;
  /** Resource key from the JWT's `perms` claim — hidden unless `user.hasPerm(resource)` is true. */
  permResource?: string;
  /** Hidden unless `process.env.NODE_ENV !== 'production'`. */
  devOnly?: boolean;
  /** Hidden unless `user.is_root` — a different axis from `permResource`/`hasPerm`. */
  rootOnly?: boolean;
};

export type PanelNavGroup = {
  title: string;
  items: PanelNavItem[];
};

export type PanelShellBranding = {
  /** Small uppercase kicker over the menu title and in the sidebar header. */
  kicker: string;
  /** Short badge label (e.g. initials) shown in the full-bleed route header. */
  shortLabel: string;
  /** Full brand label shown next to `shortLabel` in the full-bleed route header. */
  fullLabel: string;
  /** Sidebar menu heading. Defaults to "Menu do painel". */
  menuTitle?: string;
  /** Sidebar menu sub-text. Defaults to a generic line. */
  menuDescription?: string;
};

export type PanelShellBaseProps = {
  children: ReactNode;
  navGroups: PanelNavGroup[];
  branding: PanelShellBranding;
  /**
   * Routes that should render children full-bleed (just a brand header, no sidebar) —
   * e.g. a wizard flow. Receives the current pathname.
   */
  isFullBleedRoute?: (pathname: string) => boolean;
  /** Optional trailing badge for a nav item (e.g. an unread count). */
  renderItemBadge?: (item: PanelNavItem, collapsed: boolean) => ReactNode;
  /**
   * When true (default), a pathname that matches no visible nav item calls `notFound()`.
   * Set false to let the shell render any `/painel` route regardless of the nav list.
   */
  enforcePagePermission?: boolean;
};

export function PanelShellBase({
  children,
  navGroups,
  branding,
  isFullBleedRoute,
  renderItemBadge,
  enforcePagePermission = true,
}: PanelShellBaseProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isDevEnvironment = process.env.NODE_ENV !== 'production';
  const fullBleed = isFullBleedRoute?.(pathname) ?? false;

  const menuTitle = branding.menuTitle ?? 'Menu do painel';
  const menuDescription =
    branding.menuDescription ?? 'Navegue entre os modulos administrativos.';

  const visibleNavigationGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.permResource || (user?.hasPerm(item.permResource) ?? false)) &&
          (!item.devOnly || isDevEnvironment) &&
          (!item.rootOnly || (user?.is_root ?? false))
      ),
    }))
    .filter((group) => group.items.length > 0);

  const checkPagePermission = (path: string = pathname) => {
    const item = navGroups
      .flatMap((group) => group.items)
      .find(
        (candidate) =>
          path?.startsWith(candidate.href) &&
          (candidate.rootOnly
            ? (user?.is_root ?? false)
            : (user?.hasPerm(candidate.permResource ?? 'default') ?? false))
      );

    if (item) return;
    notFound();
  };

  if (enforcePagePermission) {
    void checkPagePermission();
  }

  if (fullBleed) {
    return (
      <div className="flex h-full min-h-full flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center px-4 md:px-6">
            <Link href="/painel" className="inline-flex items-center gap-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary"
                aria-hidden="true"
              >
                {branding.shortLabel}
              </span>
              <span className="text-sm font-semibold tracking-[0.2em] text-foreground uppercase">
                {branding.fullLabel}
              </span>
            </Link>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-muted/20">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex border-r border-border bg-background transition-transform duration-200 lg:fixed lg:translate-x-0',
          collapsed ? 'w-24' : 'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full w-full flex-col">
          <div className="border-b border-border px-4 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className={cn(collapsed && 'lg:hidden')}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  {branding.kicker}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{menuTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{menuDescription}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={collapsed ? 'Expandir menu lateral' : 'Retrair menu lateral'}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'icon' }),
                    'hidden lg:inline-flex'
                  )}
                  onClick={() => setCollapsed((current) => !current)}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  aria-label="Fechar menu lateral"
                  className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'lg:hidden')}
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <nav className="panel-menu-scroll flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6">
            {visibleNavigationGroups.map((group, groupIndex) => (
              <div
                key={group.title}
                className={cn('space-y-2', groupIndex > 0 && 'border-t border-border pt-6')}
              >
                <p
                  className={cn(
                    'px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground',
                    collapsed && 'lg:hidden'
                  )}
                >
                  <b>{group.title}</b>
                </p>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === '/painel'
                        ? pathname === item.href
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.title : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          collapsed && 'justify-center lg:px-0'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={cn(collapsed && 'lg:hidden')}>{item.title}</span>
                        {renderItemBadge?.(item, collapsed) ?? null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <div
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-1 flex-col',
          collapsed ? 'lg:pl-24' : 'lg:pl-72'
        )}
      >
        <header className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Abrir menu lateral"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'lg:hidden')}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>

              <button
                type="button"
                aria-label={collapsed ? 'Expandir menu lateral' : 'Retrair menu lateral'}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'icon' }),
                  'hidden lg:inline-flex'
                )}
                onClick={() => setCollapsed((current) => !current)}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {user?.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 min-w-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
