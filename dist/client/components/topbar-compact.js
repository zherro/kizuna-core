'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, LogIn, LogOut, MapPin, Menu, Moon, Search, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppPreferences } from '../providers/app-preferences-provider';
import { useAuth } from '../providers/auth-provider';
import { Button, buttonVariants } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
/**
 * Cabeçalho compacto — variante do `Topbar`. Marca curta com pino, nav central,
 * botão de busca redondo. Mesmas props de nav/auth do `Topbar`; some em `/painel`.
 * Todo tokenizado (troca de tema/cor afeta igual).
 */
export function TopbarCompact({ navLinks = [], authCta = 'single', loginHref = '/login', showThemeToggle = true, eyebrow = 'Você está em', brandLabel = 'Início', searchHref = '/busca', } = {}) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const { resolvedTheme, setTheme, messages } = useAppPreferences();
    const { user, logout } = useAuth();
    if (pathname.startsWith('/painel'))
        return null;
    async function handleLogout() {
        setLogoutLoading(true);
        try {
            await logout();
        }
        finally {
            setLogoutLoading(false);
            setMenuOpen(false);
        }
    }
    return (_jsxs("header", { className: "sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md", children: [_jsxs("div", { className: "mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8", children: [_jsxs(Link, { href: "/", className: "flex min-w-0 flex-col leading-tight", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", children: eyebrow }), _jsxs("span", { className: "flex items-center gap-1 truncate text-sm font-bold text-foreground", children: [_jsx(MapPin, { className: "h-3.5 w-3.5 text-primary" }), " ", brandLabel] })] }), _jsxs("nav", { className: "hidden items-center gap-5 md:flex", children: [navLinks.map((item) => (_jsx(Link, { href: item.href, className: cn('text-sm font-medium transition-colors', pathname === item.href
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'), children: item.label }, item.href))), user ? (_jsxs(Link, { href: "/painel", className: cn('flex items-center gap-1.5 text-sm font-medium transition-colors', pathname.startsWith('/painel')
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'), children: [_jsx(LayoutDashboard, { className: "h-4 w-4" }), messages.default.dashboard] })) : null] }), _jsxs("div", { className: "flex items-center gap-2", children: [showThemeToggle && (_jsx("button", { type: "button", "aria-label": messages.nav.theme, onClick: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), className: "flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground", children: resolvedTheme === 'dark' ? _jsx(Sun, { className: "h-4 w-4" }) : _jsx(Moon, { className: "h-4 w-4" }) })), searchHref && (_jsx(Link, { href: searchHref, "aria-label": "Buscar", className: "hidden h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground md:flex", children: _jsx(Search, { className: "h-4 w-4" }) })), !user &&
                                (authCta === 'single' ? (_jsxs(Link, { href: loginHref, className: cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden h-9 gap-1.5 border-2 border-primary px-4 text-sm text-primary hover:bg-primary/10 md:inline-flex'), children: [_jsx(LogIn, { className: "h-4 w-4" }), messages.nav.signIn] })) : (_jsxs("div", { className: "hidden items-center gap-3 md:flex", children: [_jsx(Link, { className: "text-sm font-medium text-muted-foreground hover:text-foreground", href: "/login", children: messages.nav.login }), _jsx(Link, { className: "text-sm font-medium text-muted-foreground hover:text-foreground", href: "/registre-se", children: messages.nav.signUp })] }))), user && (_jsx(Button, { variant: "ghost", size: "sm", onClick: handleLogout, disabled: logoutLoading, className: "hidden h-9 px-3 text-sm text-muted-foreground hover:text-foreground md:inline-flex", children: logoutLoading ? 'Saindo...' : 'Sair' })), _jsx(Button, { variant: "outline", size: "icon", className: "h-9 w-9 md:hidden", "aria-label": messages.nav.openMenu, onClick: () => setMenuOpen(true), children: _jsx(Menu, { className: "h-4 w-4" }) })] })] }), _jsx(Sheet, { open: menuOpen, onOpenChange: setMenuOpen, children: _jsxs(SheetContent, { side: "right", className: "w-72", children: [_jsx(SheetHeader, { children: _jsx(SheetTitle, { children: messages.nav.openMenu }) }), _jsxs("nav", { className: "mt-4 flex flex-col gap-1", children: [navLinks.map((item) => (_jsxs(Link, { href: item.href, onClick: () => setMenuOpen(false), className: "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: [item.icon, item.label] }, item.href))), user ? (_jsxs(Link, { href: "/painel", onClick: () => setMenuOpen(false), className: "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: [_jsx(LayoutDashboard, { className: "h-4 w-4" }), messages.default.dashboard] })) : null, searchHref && (_jsxs(Link, { href: searchHref, onClick: () => setMenuOpen(false), className: "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: [_jsx(Search, { className: "h-4 w-4" }), " Buscar"] })), _jsx("div", { className: "my-2 border-t border-border" }), !user ? (_jsxs(_Fragment, { children: [_jsxs(Link, { href: "/login", onClick: () => setMenuOpen(false), className: "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: [_jsx(LogIn, { className: "h-4 w-4" }), " ", messages.nav.login] }), _jsx(Link, { href: "/registre-se", onClick: () => setMenuOpen(false), className: "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: messages.nav.signUp })] })) : (_jsxs("button", { type: "button", onClick: handleLogout, disabled: logoutLoading, className: "flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: [_jsx(LogOut, { className: "h-4 w-4" }), " ", logoutLoading ? 'Saindo...' : 'Sair'] }))] })] }) })] }));
}
//# sourceMappingURL=topbar-compact.js.map