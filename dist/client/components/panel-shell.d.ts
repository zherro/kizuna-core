import { type ComponentType, type ReactNode } from 'react';
export type PanelNavIcon = ComponentType<{
    className?: string;
}>;
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
export type PanelNavAccessUser = {
    hasPerm?: (resource: string) => boolean;
    is_root?: boolean;
} | null | undefined;
/**
 * Whether `item` is reachable by `user` — same rule `PanelShellBase` uses for
 * both sidebar visibility and direct-navigation permission checks. Exported
 * so other consumers (e.g. a command palette) apply the identical rule
 * instead of re-implementing it.
 */
export declare function isPanelNavItemAccessible(item: Pick<PanelNavItem, 'permResource' | 'rootOnly' | 'visibleIf'>, user: PanelNavAccessUser): boolean;
export type PanelShellBranding = {
    /** Small uppercase kicker above the brand name in the sidebar header. */
    kicker: string;
    /** Short badge label (e.g. initials) shown in the brand mark. */
    shortLabel: string;
    /** Full brand label shown next to `shortLabel`. */
    fullLabel: string;
};
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
export declare function PanelShellBase({ children, navGroups, branding, topActions, isFullBleedRoute, renderItemBadge, fullBleedHeaderExtra, headerExtra, enforcePagePermission, userProfileHref, }: PanelShellBaseProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=panel-shell.d.ts.map