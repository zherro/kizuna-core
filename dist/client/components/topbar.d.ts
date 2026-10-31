import { type ReactNode } from 'react';
export type TopbarNavLink = {
    href: string;
    label: string;
    icon?: ReactNode;
};
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
/**
 * Public-site top bar: brand dot + title, home / dashboard / custom links, location trigger,
 * auth actions and an optional light/dark toggle. Hidden on `/painel` routes (the panel has its
 * own chrome). Labels come from `useAppPreferences().messages`; everything else that a consumer
 * app might want to change (extra nav links, whether to show the theme toggle, how prominent the
 * sign-in action is) is a prop — see `TopbarProps`.
 */
export declare function Topbar({ navLinks, showThemeToggle, authCta, loginHref, }?: TopbarProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=topbar.d.ts.map