import { type ComponentType, type ReactNode } from 'react';
export type PanelNavIcon = ComponentType<{
    className?: string;
}>;
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
export declare function PanelShellBase({ children, navGroups, branding, isFullBleedRoute, renderItemBadge, enforcePagePermission, }: PanelShellBaseProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=panel-shell.d.ts.map