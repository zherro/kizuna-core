'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from 'next/link';
import { notFound, usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { useAuth } from '../providers/auth-provider';
import { cn } from '../../lib/utils';
/**
 * Whether `item` is reachable by `user` — same rule `PanelShellBase` uses for
 * both sidebar visibility and direct-navigation permission checks. Exported
 * so other consumers (e.g. a command palette) apply the identical rule
 * instead of re-implementing it.
 */
export function isPanelNavItemAccessible(item, user) {
    if (item.visibleIf && item.visibleIf.length > 0) {
        return item.visibleIf.some((cond) => (!cond.permResource || (user?.hasPerm?.(cond.permResource) ?? false)) &&
            (!cond.rootOnly || (user?.is_root ?? false)));
    }
    return ((!item.permResource || (user?.hasPerm?.(item.permResource) ?? false)) &&
        (!item.rootOnly || (user?.is_root ?? false)));
}
const topActionClassName = (active, collapsed) => cn('flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition', collapsed ? 'lg:flex-col lg:gap-1 lg:py-2' : 'flex-col', active
    ? 'bg-primary text-primary-foreground shadow-sm'
    : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground');
export function PanelShellBase({ children, navGroups, branding, topActions, isFullBleedRoute, renderItemBadge, fullBleedHeaderExtra, headerExtra, enforcePagePermission = true, userProfileHref, }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const isDevEnvironment = process.env.NODE_ENV !== 'production';
    const fullBleed = isFullBleedRoute?.(pathname) ?? false;
    const passesAccessGate = (item) => isPanelNavItemAccessible(item, user);
    const visibleNavigationGroups = navGroups
        .map((group) => ({
        ...group,
        items: group.items.filter((item) => passesAccessGate(item) && (!item.devOnly || isDevEnvironment) && !item.sidebarHidden),
    }))
        .filter((group) => group.items.length > 0);
    const checkPagePermission = (path = pathname) => {
        const item = navGroups
            .flatMap((group) => group.items)
            .find((candidate) => path?.startsWith(candidate.href) && passesAccessGate(candidate));
        if (item)
            return;
        notFound();
    };
    // Só aplica o gate quando já sabemos quem é o usuário. `user` null aqui =
    // hidratação pendente (o layout de /painel já redireciona pra /login se não há
    // sessão), não "acesso negado" — bloquear nesse estado manda pra notFound() no F5.
    if (enforcePagePermission && user) {
        void checkPagePermission();
    }
    const renderDrawer = (overlayOnly) => (_jsxs(_Fragment, { children: [mobileOpen ? (_jsx("button", { type: "button", "aria-label": "Fechar menu lateral", className: cn('fixed inset-0 z-40 bg-black/40', !overlayOnly && 'lg:hidden'), onClick: () => setMobileOpen(false) })) : null, _jsx("aside", { className: cn('fixed inset-y-0 left-0 z-50 flex border-r border-border bg-background transition-transform duration-200', !overlayOnly && 'lg:fixed lg:translate-x-0', 'w-72', collapsed && 'lg:w-24', mobileOpen ? 'translate-x-0' : '-translate-x-full'), children: _jsxs("div", { className: "flex h-full w-full flex-col", children: [_jsxs("div", { className: "px-4 py-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs(Link, { href: "/", className: cn('flex min-w-0 items-center gap-3', collapsed && 'lg:justify-center'), children: [_jsx("span", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground", "aria-hidden": "true", children: branding.shortLabel }), _jsxs("span", { className: cn('min-w-0', collapsed && 'lg:hidden'), children: [_jsx("p", { className: "text-[10px] font-semibold uppercase tracking-[0.24em] text-primary", children: branding.kicker }), _jsx("p", { className: "truncate text-base font-bold tracking-tight text-foreground", children: branding.fullLabel })] })] }), _jsx("button", { type: "button", "aria-label": "Fechar menu lateral", className: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'shrink-0 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 lg:hidden'), onClick: () => setMobileOpen(false), children: _jsx(X, { className: "h-4 w-4" }) })] }), topActions && topActions.length > 0 ? (_jsx("div", { className: cn('mt-4 grid grid-cols-3 gap-2', collapsed && 'lg:grid-cols-1'), children: topActions.map((action) => {
                                        const Icon = action.icon;
                                        const className = topActionClassName(action.isActive ?? false, collapsed);
                                        const content = (_jsxs(_Fragment, { children: [_jsx(Icon, { className: "h-5 w-5 shrink-0" }), _jsx("span", { className: cn('truncate', collapsed && 'lg:hidden'), children: action.title })] }));
                                        if (action.href) {
                                            return (_jsx(Link, { href: action.href, onClick: () => setMobileOpen(false), className: className, children: content }, action.title));
                                        }
                                        return (_jsx("button", { type: "button", onClick: action.onClick, className: className, children: content }, action.title));
                                    }) })) : null] }), _jsx("div", { className: "mx-4 h-px bg-border" }), _jsx("nav", { className: "panel-menu-scroll flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4", children: visibleNavigationGroups.map((group, groupIndex) => (_jsxs("div", { className: cn('space-y-2', groupIndex > 0 && 'border-t border-border pt-6'), children: [_jsx("p", { className: cn('px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground', collapsed && 'lg:hidden'), children: _jsx("b", { children: group.title }) }), _jsx("div", { className: "space-y-1", children: group.items.map((item) => {
                                            const Icon = item.icon;
                                            const active = item.href === '/painel'
                                                ? pathname === item.href
                                                : pathname === item.href || pathname.startsWith(`${item.href}/`);
                                            return (_jsxs(Link, { href: item.href, title: collapsed ? item.title : undefined, onClick: () => setMobileOpen(false), className: cn('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition', active
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground', collapsed && 'justify-center lg:px-0'), children: [_jsx("span", { className: cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', active ? 'bg-primary-foreground/15' : 'bg-muted/60'), children: _jsx(Icon, { className: "h-4 w-4" }) }), _jsx("span", { className: cn('truncate', collapsed && 'lg:hidden'), children: item.title }), renderItemBadge?.(item, collapsed) ?? null] }, item.href));
                                        }) })] }, group.title))) })] }) })] }));
    if (fullBleed) {
        return (_jsxs("div", { className: "flex h-full min-h-full flex-1 flex-col bg-background", children: [renderDrawer(true), _jsx("header", { className: "sticky top-0 z-30 shrink-0 bg-background/95 shadow-sm backdrop-blur", children: _jsxs("div", { className: "flex h-16 items-center gap-3 px-4 md:px-6", children: [_jsxs("button", { type: "button", onClick: () => setMobileOpen(true), className: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-full'), "aria-label": "Abrir menu", children: [_jsx(Menu, { className: "mr-1 h-4 w-4" }), " Menu"] }), _jsxs(Link, { href: "/painel", className: "inline-flex items-center gap-3", children: [_jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground", "aria-hidden": "true", children: branding.shortLabel }), _jsx("span", { className: "hidden text-sm font-semibold tracking-[0.2em] text-foreground uppercase sm:inline", children: branding.fullLabel })] }), _jsx("div", { id: "wz-header-slot", className: "ml-auto flex min-w-0 items-center gap-2", children: fullBleedHeaderExtra })] }) }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto", children: children })] }));
    }
    return (_jsxs("div", { className: "flex h-full min-h-0 overflow-hidden bg-muted/20", children: [renderDrawer(false), _jsxs("div", { className: cn('flex h-full min-h-0 min-w-0 flex-1 flex-col', collapsed ? 'lg:pl-24' : 'lg:pl-72'), children: [_jsx("header", { className: "sticky top-0 z-30 bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:px-6", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx("button", { type: "button", "aria-label": collapsed ? 'Expandir menu lateral' : 'Abrir ou retrair menu lateral', className: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full'), onClick: () => {
                                            const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
                                            if (isDesktop) {
                                                setCollapsed((current) => !current);
                                            }
                                            else {
                                                setMobileOpen(true);
                                            }
                                        }, children: _jsx(Menu, { className: "h-4 w-4" }) }) }), _jsxs("div", { className: "ml-auto flex items-center gap-3", children: [headerExtra, _jsxs("div", { className: "flex min-w-0 items-center gap-3 rounded-full bg-muted/60 py-1.5 pr-2 pl-1.5", children: [_jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground", children: user?.initials }), _jsxs("div", { className: "hidden min-w-0 sm:block", children: [userProfileHref ? (_jsx(Link, { href: userProfileHref, className: "block truncate text-sm font-semibold text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground", children: user?.name })) : (_jsx("p", { className: "truncate text-sm font-semibold text-foreground", children: user?.name })), _jsx("p", { className: "truncate text-xs text-muted-foreground", children: user?.subtitle })] }), _jsx("button", { type: "button", "aria-label": "Sair", onClick: () => void logout(), className: cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full shrink-0'), children: _jsx(LogOut, { className: "h-4 w-4" }) })] })] })] }) }), _jsx("div", { className: "min-h-0 flex-1 min-w-0 overflow-y-auto", children: children })] })] }));
}
//# sourceMappingURL=panel-shell.js.map