'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Home, LayoutDashboard, LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppPreferences } from '../providers/app-preferences-provider';
import { useAuth } from '../providers/auth-provider';
import { Button, buttonVariants } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { LocationModal, LocationTrigger } from './location-modal';
import { Grid } from './ui/grid';
const softNavIconClass = 'shrink-0 text-muted-foreground/70 [&>svg]:h-[18px] [&>svg]:w-[18px]';
const softNavIconClassSm = 'shrink-0 text-muted-foreground/70 [&>svg]:h-4 [&>svg]:w-4';
const navLinkClass = 'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[15px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground';
const mobileNavLinkClass = 'flex items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground';
/**
 * Public-site top bar: brand dot + title, home / dashboard / custom links, location trigger,
 * auth actions and an optional light/dark toggle. Hidden on `/painel` routes (the panel has its
 * own chrome). Labels come from `useAppPreferences().messages`; everything else that a consumer
 * app might want to change (extra nav links, whether to show the theme toggle, how prominent the
 * sign-in action is) is a prop — see `TopbarProps`.
 */
export function Topbar({ navLinks = [], showThemeToggle = true, authCta = 'split', loginHref = '/login', } = {}) {
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
        }
        finally {
            setLogoutLoading(false);
            setMenuOpen(false);
        }
    }
    if (pathname.startsWith('/painel')) {
        return null;
    }
    const allNavLinks = [
        { href: '/', label: messages.nav.home, icon: _jsx(Home, {}) },
        ...navLinks,
    ];
    return (_jsxs(_Fragment, { children: [_jsx("header", { className: "sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-sm", children: _jsx(Grid, { container: true, containerSize: "wide", padding: "none", children: _jsx(Grid, { children: _jsxs("div", { className: "mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8", children: [_jsxs(Link, { href: "/", className: "flex items-center gap-2.5", children: [_jsx("span", { className: "inline-block h-2.5 w-2.5 rounded-full bg-primary", "aria-hidden": "true" }), _jsx("span", { className: "text-lg font-semibold tracking-tight", children: messages.nav.title })] }), _jsxs("nav", { className: "hidden items-center gap-1 md:flex", children: [allNavLinks.map((link) => (_jsxs(Link, { className: navLinkClass, href: link.href, children: [link.icon && _jsx("span", { className: softNavIconClassSm, children: link.icon }), link.label] }, link.href))), user && (_jsxs(Link, { className: navLinkClass, href: "/painel", children: [_jsx("span", { className: softNavIconClassSm, children: _jsx(LayoutDashboard, {}) }), messages.default.dashboard] }))] }), _jsxs("div", { className: "hidden items-center gap-2 md:flex", children: [_jsx(LocationTrigger, { onClick: () => setLocationOpen(true) }), showThemeToggle && (_jsx(Button, { variant: "outline", size: "icon", "aria-label": messages.nav.theme, onClick: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), children: resolvedTheme === 'dark' ? (_jsx(Sun, { className: "h-4 w-4" })) : (_jsx(Moon, { className: "h-4 w-4" })) })), !user &&
                                            (authCta === 'single' ? (_jsxs(Link, { href: loginHref, style: { borderColor: 'var(--primary)', color: 'var(--primary)' }, className: cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-9 gap-1.5 border-2 px-4 text-[15px] hover:bg-primary/10'), children: [_jsx(LogIn, { className: "h-4 w-4" }), messages.nav.signIn] })) : (_jsxs(_Fragment, { children: [_jsx(Link, { className: navLinkClass, href: "/login", children: messages.nav.login }), _jsx(Link, { className: navLinkClass, href: "/registre-se", children: messages.nav.signUp })] }))), user && (_jsx(Button, { variant: "ghost", size: "sm", onClick: handleLogout, disabled: logoutLoading, className: "h-auto px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: logoutLoading ? 'Saindo...' : 'Sair' }))] }), _jsx(Button, { variant: "outline", size: "icon", className: "md:hidden", "aria-label": messages.nav.openMenu, onClick: () => setMenuOpen(true), children: _jsx(Menu, { className: "h-4 w-4" }) })] }) }) }) }), _jsx(LocationModal, { open: locationOpen, onClose: () => setLocationOpen(false) }), _jsx(Sheet, { open: menuOpen, onOpenChange: setMenuOpen, children: _jsxs(SheetContent, { side: "top", className: "flex flex-col p-0", children: [_jsxs(SheetHeader, { className: "p-3", children: [_jsx(SheetTitle, { children: messages.nav.title }), _jsx(Button, { variant: "ghost", size: "icon", "aria-label": messages.nav.closeMenu, onClick: () => setMenuOpen(false), children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("nav", { className: "flex flex-col gap-1 p-3", children: [allNavLinks.map((link) => (_jsxs(Link, { className: mobileNavLinkClass, href: link.href, onClick: () => setMenuOpen(false), children: [link.icon && _jsx("span", { className: softNavIconClass, children: link.icon }), link.label] }, link.href))), user && (_jsxs(Link, { className: mobileNavLinkClass, href: "/painel", onClick: () => setMenuOpen(false), children: [_jsx("span", { className: softNavIconClass, children: _jsx(LayoutDashboard, {}) }), messages.default.dashboard] })), _jsx("div", { className: "my-1 border-t border-border/70" }), _jsx("div", { className: "px-3", children: _jsx(LocationTrigger, { onClick: () => {
                                            setMenuOpen(false);
                                            setLocationOpen(true);
                                        } }) }), showThemeToggle && (_jsxs("button", { type: "button", onClick: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), className: cn(mobileNavLinkClass, 'text-left'), children: [_jsx("span", { className: softNavIconClass, children: resolvedTheme === 'dark' ? _jsx(Sun, {}) : _jsx(Moon, {}) }), messages.nav.theme] })), !user &&
                                    (authCta === 'single' ? (_jsxs(Link, { href: loginHref, onClick: () => setMenuOpen(false), style: { borderColor: 'var(--primary)', color: 'var(--primary)' }, className: cn(buttonVariants({ variant: 'outline' }), 'mt-2 justify-center gap-1.5 border-2 text-[15px] hover:bg-primary/10'), children: [_jsx(LogIn, { className: "h-4 w-4" }), messages.nav.signIn] })) : (_jsxs(_Fragment, { children: [_jsx(Link, { className: mobileNavLinkClass, href: "/login", onClick: () => setMenuOpen(false), children: messages.nav.login }), _jsx(Link, { className: mobileNavLinkClass, href: "/registre-se", onClick: () => setMenuOpen(false), children: messages.nav.signUp })] }))), user && (_jsxs(Button, { variant: "ghost", onClick: handleLogout, disabled: logoutLoading, className: cn(mobileNavLinkClass, 'h-auto justify-start'), children: [_jsx("span", { className: softNavIconClass, children: _jsx(LogOut, {}) }), logoutLoading ? 'Saindo...' : 'Sair'] }))] })] }) })] }));
}
//# sourceMappingURL=topbar.js.map