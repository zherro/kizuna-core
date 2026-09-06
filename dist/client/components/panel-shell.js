'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { notFound, usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { buttonVariants } from './ui/button';
import { useAuth } from '../providers/auth-provider';
import { cn } from '../../lib/utils';
export function PanelShellBase({ children, navGroups, branding, isFullBleedRoute, renderItemBadge, enforcePagePermission = true, }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const isDevEnvironment = process.env.NODE_ENV !== 'production';
    const fullBleed = isFullBleedRoute?.(pathname) ?? false;
    const menuTitle = branding.menuTitle ?? 'Menu do painel';
    const menuDescription = branding.menuDescription ?? 'Navegue entre os modulos administrativos.';
    const visibleNavigationGroups = navGroups
        .map((group) => ({
        ...group,
        items: group.items.filter((item) => (!item.permResource || (user?.hasPerm(item.permResource) ?? false)) &&
            (!item.devOnly || isDevEnvironment) &&
            (!item.rootOnly || (user?.is_root ?? false))),
    }))
        .filter((group) => group.items.length > 0);
    const checkPagePermission = (path = pathname) => {
        const item = navGroups
            .flatMap((group) => group.items)
            .find((candidate) => path?.startsWith(candidate.href) &&
            (candidate.rootOnly
                ? (user?.is_root ?? false)
                : (user?.hasPerm(candidate.permResource ?? 'default') ?? false)));
        if (item)
            return;
        notFound();
    };
    if (enforcePagePermission) {
        void checkPagePermission();
    }
    if (fullBleed) {
        return (_jsxs("div", { className: "flex h-full min-h-full flex-1 flex-col bg-background", children: [_jsx("header", { className: "sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur", children: _jsx("div", { className: "flex h-16 items-center px-4 md:px-6", children: _jsxs(Link, { href: "/painel", className: "inline-flex items-center gap-3", children: [_jsx("span", { className: "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary", "aria-hidden": "true", children: branding.shortLabel }), _jsx("span", { className: "text-sm font-semibold tracking-[0.2em] text-foreground uppercase", children: branding.fullLabel })] }) }) }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto", children: children })] }));
    }
    return (_jsxs("div", { className: "flex h-full min-h-0 overflow-hidden bg-muted/20", children: [mobileOpen ? (_jsx("button", { type: "button", "aria-label": "Fechar menu lateral", className: "fixed inset-0 z-40 bg-black/40 lg:hidden", onClick: () => setMobileOpen(false) })) : null, _jsx("aside", { className: cn('fixed inset-y-0 left-0 z-50 flex border-r border-border bg-background transition-transform duration-200 lg:fixed lg:translate-x-0', collapsed ? 'w-24' : 'w-72', mobileOpen ? 'translate-x-0' : '-translate-x-full'), children: _jsxs("div", { className: "flex h-full w-full flex-col", children: [_jsx("div", { className: "border-b border-border px-4 py-5", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: cn(collapsed && 'lg:hidden'), children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-primary", children: branding.kicker }), _jsx("h2", { className: "mt-2 text-xl font-semibold tracking-tight", children: menuTitle }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: menuDescription })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", "aria-label": collapsed ? 'Expandir menu lateral' : 'Retrair menu lateral', className: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'hidden lg:inline-flex'), onClick: () => setCollapsed((current) => !current), children: collapsed ? (_jsx(ChevronRight, { className: "h-4 w-4" })) : (_jsx(ChevronLeft, { className: "h-4 w-4" })) }), _jsx("button", { type: "button", "aria-label": "Fechar menu lateral", className: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'lg:hidden'), onClick: () => setMobileOpen(false), children: _jsx(X, { className: "h-4 w-4" }) })] })] }) }), _jsx("nav", { className: "panel-menu-scroll flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6", children: visibleNavigationGroups.map((group, groupIndex) => (_jsxs("div", { className: cn('space-y-2', groupIndex > 0 && 'border-t border-border pt-6'), children: [_jsx("p", { className: cn('px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground', collapsed && 'lg:hidden'), children: _jsx("b", { children: group.title }) }), _jsx("div", { className: "space-y-1", children: group.items.map((item) => {
                                            const Icon = item.icon;
                                            const active = item.href === '/painel'
                                                ? pathname === item.href
                                                : pathname === item.href || pathname.startsWith(`${item.href}/`);
                                            return (_jsxs(Link, { href: item.href, title: collapsed ? item.title : undefined, onClick: () => setMobileOpen(false), className: cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition', active
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground', collapsed && 'justify-center lg:px-0'), children: [_jsx(Icon, { className: "h-4 w-4 shrink-0" }), _jsx("span", { className: cn(collapsed && 'lg:hidden'), children: item.title }), renderItemBadge?.(item, collapsed) ?? null] }, item.href));
                                        }) })] }, group.title))) })] }) }), _jsxs("div", { className: cn('flex h-full min-h-0 min-w-0 flex-1 flex-col', collapsed ? 'lg:pl-24' : 'lg:pl-72'), children: [_jsx("header", { className: "border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-6", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", "aria-label": "Abrir menu lateral", className: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'lg:hidden'), onClick: () => setMobileOpen(true), children: _jsx(Menu, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", "aria-label": collapsed ? 'Expandir menu lateral' : 'Retrair menu lateral', className: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'hidden lg:inline-flex'), onClick: () => setCollapsed((current) => !current), children: collapsed ? (_jsx(ChevronRight, { className: "h-4 w-4" })) : (_jsx(ChevronLeft, { className: "h-4 w-4" })) })] }), _jsxs("div", { className: "ml-auto flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm", children: [_jsx("div", { className: "flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary", children: user?.initials }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-semibold text-foreground", children: user?.name }), _jsx("p", { className: "truncate text-xs text-muted-foreground", children: user?.subtitle })] }), _jsxs("button", { type: "button", onClick: () => void logout(), className: buttonVariants({ variant: 'ghost', size: 'sm' }), children: [_jsx(LogOut, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Sair" })] })] })] }) }), _jsx("div", { className: "min-h-0 flex-1 min-w-0 overflow-y-auto", children: children })] })] }));
}
//# sourceMappingURL=panel-shell.js.map