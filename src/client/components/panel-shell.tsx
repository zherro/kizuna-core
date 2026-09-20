'use client';

import Link from 'next/link';
import { notFound, usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { useAuth } from '../providers/auth-provider';
import { cn } from '../../lib/utils';

export type PanelNavIcon = ComponentType<{ className?: string }>;

export type PanelNavAccessCondition = {
  /** Resource key from the JWT's `perms` claim — passes if `user.hasPerm(resource)` is true. */
  permResource?: string;
  /** Passes if `user.is_root` — a different axis from `permResource`/`hasPerm`. */
  rootOnly?: boolean;
};

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
  /**
   * Alternative to `permResource`/`rootOnly`: visible (and reachable via direct
   * navigation) if ANY of these conditions passes. Used by "hub" items that
   * aggregate access to several sub-resources — the hub link itself has no
   * single `permResource` of its own.
   */
  visibleIf?: PanelNavAccessCondition[];
  /**
   * Hides the item from the rendered sidebar while keeping it valid for
   * `checkPagePermission` — use when a real screen's navigation moved into a
   * hub page but the screen's own URL didn't change.
   */
  sidebarHidden?: boolean;
};

export type PanelNavGroup = {
  title: string;
  items: PanelNavItem[];
};

/** A quick-access shortcut rendered as one of the icon chips at the top of the sidebar. */
export type PanelTopAction = {
  title: string;
  icon: PanelNavIcon;
  /** Navigates when set. Omit and use `onClick` for a non-navigation action (e.g. opening search). */
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
};

/** User shape needed to evaluate access — a subset of `useAuth()`'s `user`. */
export type PanelNavAccessUser =
  | {
      hasPerm?: (resource: string) => boolean;
      is_root?: boolean;
    }
  | null
  | undefined;

/**
 * Whether `item` is reachable by `user` — same rule `PanelShellBase` uses for
 * both sidebar visibility and direct-navigation permission checks. Exported
 * so other consumers (e.g. a command palette) apply the identical rule
 * instead of re-implementing it.
 */
export function isPanelNavItemAccessible(
  item: Pick<PanelNavItem, 'permResource' | 'rootOnly' | 'visibleIf'>,
  user: PanelNavAccessUser
): boolean {
  if (item.visibleIf && item.visibleIf.length > 0) {
    return item.visibleIf.some(
      (cond) =>
        (!cond.permResource || (user?.hasPerm?.(cond.permResource) ?? false)) &&
        (!cond.rootOnly || (user?.is_root ?? false))
    );
  }
  return (
    (!item.permResource || (user?.hasPerm?.(item.permResource) ?? false)) &&
    (!item.rootOnly || (user?.is_root ?? false))
  );
}

export type PanelShellBranding = {
  /** Small uppercase kicker above the brand name in the sidebar header. */
  kicker: string;
  /** Short badge label (e.g. initials) shown in the brand mark. */
  shortLabel: string;
  /** Full brand label shown next to `shortLabel`. */
  fullLabel: string;
};

const topActionClassName = (active: boolean, collapsed: boolean) =>
  cn(
    'flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition',
    collapsed ? 'lg:flex-col lg:gap-1 lg:py-2' : 'flex-col',
    active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
  );

export type PanelShellBaseProps = {
  children: ReactNode;
  navGroups: PanelNavGroup[];
  branding: PanelShellBranding;
  /**
   * Quick-access shortcuts rendered as icon chips at the top of the sidebar,
   * above the nav groups (e.g. Home / Busca / Painel).
   */
  topActions?: PanelTopAction[];
  /**
   * Routes that should render children full-bleed (just a brand header, no sidebar) —
   * e.g. a wizard flow. Receives the current pathname.
   */
  isFullBleedRoute?: (pathname: string) => boolean;
  /** Optional trailing badge for a nav item (e.g. an unread count). */
  renderItemBadge?: (item: PanelNavItem, collapsed: boolean) => ReactNode;
  /**
   * Extra content rendered on the right of the single full-bleed header (e.g. a wizard's
   * mode label + layout toggle). Only shown on full-bleed routes.
   */
  fullBleedHeaderExtra?: ReactNode;
  /**
   * Extra content rendered on the right of the standard (non full-bleed)
   * header, before the user card — e.g. a search trigger.
   */
  headerExtra?: ReactNode;
  /**
   * When true (default), a pathname that matches no visible nav item calls `notFound()`.
   * Set false to let the shell render any `/painel` route regardless of the nav list.
   */
  enforcePagePermission?: boolean;
  /** When set, the user's name in the header links here (e.g. a "my account" page). */
  userProfileHref?: string;
};

export function PanelShellBase({
  children,
  navGroups,
  branding,
  topActions,
  isFullBleedRoute,
  renderItemBadge,
  fullBleedHeaderExtra,
  headerExtra,
  enforcePagePermission = true,
  userProfileHref,
}: PanelShellBaseProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isDevEnvironment = process.env.NODE_ENV !== 'production';
  const fullBleed = isFullBleedRoute?.(pathname) ?? false;

  // Tag ao lado do nome: ROOT tem precedência sobre ADMIN (tenant_type).
  const roleTag = user?.is_root
    ? 'Root'
    : (user?.tenant_type ?? '').toUpperCase() === 'ADMIN'
      ? 'Admin'
      : null;

  const passesAccessGate = (item: PanelNavItem) => isPanelNavItemAccessible(item, user);

  const visibleNavigationGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          passesAccessGate(item) && (!item.devOnly || isDevEnvironment) && !item.sidebarHidden
      ),
    }))
    .filter((group) => group.items.length > 0);

  const checkPagePermission = (path: string = pathname) => {
    const item = navGroups
      .flatMap((group) => group.items)
      .find((candidate) => path?.startsWith(candidate.href) && passesAccessGate(candidate));

    if (item) return;
    notFound();
  };

  // Só aplica o gate quando já sabemos quem é o usuário. `user` null aqui =
  // hidratação pendente (o layout de /painel já redireciona pra /login se não há
  // sessão), não "acesso negado" — bloquear nesse estado manda pra notFound() no F5.
  if (enforcePagePermission && user) {
    void checkPagePermission();
  }

  const renderDrawer = (overlayOnly: boolean) => (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className={cn('fixed inset-0 z-40 bg-black/40', !overlayOnly && 'lg:hidden')}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex border-r border-border bg-background transition-transform duration-200',
          !overlayOnly && 'lg:fixed lg:translate-x-0',
          'w-72',
          collapsed && 'lg:w-24',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full w-full flex-col">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/"
                className={cn('flex min-w-0 items-center gap-3', collapsed && 'lg:justify-center')}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
                  aria-hidden="true"
                >
                  {branding.shortLabel}
                </span>
                <span className={cn('min-w-0', collapsed && 'lg:hidden')}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
                    {branding.kicker}
                  </p>
                  <p className="truncate text-base font-bold tracking-tight text-foreground">
                    {branding.fullLabel}
                  </p>
                </span>
              </Link>

              <button
                type="button"
                aria-label="Fechar menu lateral"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                  'shrink-0 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 lg:hidden'
                )}
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {topActions && topActions.length > 0 ? (
              <div className={cn('mt-4 grid grid-cols-3 gap-2', collapsed && 'lg:grid-cols-1')}>
                {topActions.map((action) => {
                  const Icon = action.icon;
                  const className = topActionClassName(action.isActive ?? false, collapsed);
                  const content = (
                    <>
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className={cn('truncate', collapsed && 'lg:hidden')}>{action.title}</span>
                    </>
                  );

                  if (action.href) {
                    return (
                      <Link
                        key={action.title}
                        href={action.href}
                        onClick={() => setMobileOpen(false)}
                        className={className}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button key={action.title} type="button" onClick={action.onClick} className={className}>
                      {content}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mx-4 h-px bg-border" />

          <nav className="panel-menu-scroll flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
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
                          'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          collapsed && 'justify-center lg:px-0'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            active ? 'bg-primary-foreground/15' : 'bg-muted/60'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.title}</span>
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
    </>
  );

  if (fullBleed) {
    return (
      <div className="flex h-full min-h-full flex-1 flex-col bg-background">
        {renderDrawer(true)}
        <header className="sticky top-0 z-30 shrink-0 bg-background/95 shadow-sm backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-full')}
              aria-label="Abrir menu"
            >
              <Menu className="mr-1 h-4 w-4" /> Menu
            </button>
            <Link href="/painel" className="inline-flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground"
                aria-hidden="true"
              >
                {branding.shortLabel}
              </span>
              <span className="hidden text-sm font-semibold tracking-[0.2em] text-foreground uppercase sm:inline">
                {branding.fullLabel}
              </span>
            </Link>
            <div id="wz-header-slot" className="ml-auto flex min-w-0 items-center gap-2">
              {fullBleedHeaderExtra}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-muted/20">
      {renderDrawer(false)}

      <div
        className={cn(
          'flex h-full min-h-0 min-w-0 flex-1 flex-col',
          collapsed ? 'lg:pl-24' : 'lg:pl-72'
        )}
      >
        <header className="sticky top-0 z-30 bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={collapsed ? 'Expandir menu lateral' : 'Abrir ou retrair menu lateral'}
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
                onClick={() => {
                  const isDesktop =
                    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
                  if (isDesktop) {
                    setCollapsed((current) => !current);
                  } else {
                    setMobileOpen(true);
                  }
                }}
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {headerExtra}
              <div className="flex min-w-0 items-center gap-3 rounded-full bg-muted/60 py-1.5 pr-2 pl-1.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {user?.initials}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className="flex min-w-0 items-center gap-2">
                    {userProfileHref ? (
                      <Link
                        href={userProfileHref}
                        className="block truncate text-sm font-semibold text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
                      >
                        {user?.name}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                    )}
                    {roleTag ? (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-px text-[9px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
                        {roleTag}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{user?.subtitle}</p>
                </div>
                <button
                  type="button"
                  aria-label="Sair"
                  onClick={() => void logout()}
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full shrink-0')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 min-w-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
