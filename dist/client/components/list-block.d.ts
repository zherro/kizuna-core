import { type ThemeTone } from '../../lib/ui-tone';
export type FieldFormat = {
    type: 'text';
} | {
    type: 'fallback';
    fallback: string;
}
/** For an embedded relation object (e.g. `{ id, name }`) — reads `.name`. */
 | {
    type: 'relationName';
    fallback: string;
} | {
    type: 'enum';
    labels: Record<string, string>;
    fallback?: string;
    tones?: Record<string, ThemeTone>;
}
/** `falseLabel` omitted = renders nothing (and no badge) when the value is falsy — for a flag like "Urgência" that should only ever show when on. */
 | {
    type: 'boolean';
    trueLabel: string;
    falseLabel?: string;
}
/** Dispatches to `NAMED_FORMATTERS[name]` — for real domain logic (e.g. price) that can't be expressed as plain data. */
 | {
    type: 'named';
    name: string;
};
export type FieldDisplayConfig = {
    label: string;
    /** Key into `ICON_MAP`. */
    icon?: string;
    format: FieldFormat;
};
export type ListBlockConfig = {
    resource: string;
    pageSize?: number;
    title?: string;
    action: {
        label: string;
        hrefBase: string;
        icon?: 'edit' | 'review';
    };
    statusFilter?: {
        defaultValue?: string;
    };
    /**
     * When truthy, both `createAction` and `emptyState`'s create CTA are gated: clicking checks
     * onboarding completion (via the existing `fn_is_onboarding_completed` RPC, over the generic
     * `/api/postgrest/rpc` route — DB-side, scoped to the logged-in user via the JWT; the value
     * here only decides whether to run the check at all, it isn't sent to the RPC) before
     * navigating, redirecting to `/painel/onboarding` instead if it's not done. Resolve from
     * `ScreenContext` via `"$session.xxx"` in the screen config — see `context.ts`. Omitted
     * entirely on screens that don't need the gate (e.g. admin listings), so the create button
     * behaves as a plain link.
     */
    createGateUserId?: string;
    /**
     * Always-on filters (raw PostgREST column name → value, e.g. `{ tenant_id: '...' }`), merged
     * with `statusFilter`'s current value and sent on every request — not user-adjustable, unlike
     * `statusFilter`. The one way to scope a listing (e.g. `/painel/meus-servicos` to the caller's
     * own tenant) without leaking every tenant's rows; resolve the value from `ScreenContext` via
     * `"$session.xxx"` in the screen config rather than hardcoding it — see `context.ts`.
     */
    fixedFilters?: Record<string, string>;
    createAction?: {
        href: string;
        label: string;
    };
    emptyState?: {
        message?: string;
        ctaHref?: string;
        ctaLabel?: string;
    };
    displayConfig?: {
        /** Key into `ICON_MAP`. */
        icon?: string;
        singularName?: string;
        fields?: Record<string, FieldDisplayConfig>;
        /** Rendered as small soft-filled pills in the meta row (status/sponsored/urgent...). */
        badgeFields?: string[];
        /** Rendered as plain `·`-separated text in the same meta row, after the badges. */
        visibleFields?: string[];
        /** The one field shown as a bold right-aligned stat (e.g. price), its `label` used as the small uppercase caption under it. */
        statField?: string;
    };
};
export declare function ListBlock({ config }: {
    config: ListBlockConfig;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=list-block.d.ts.map