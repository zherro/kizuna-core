import { type ReactNode } from 'react';
export type EntityViewMode = 'card' | 'list';
type EntityGridListProps<T> = {
    title: string;
    description?: string;
    items: T[];
    getKey: (item: T) => string;
    renderCard: (item: T) => ReactNode;
    renderRow: (item: T) => ReactNode;
    actions?: ReactNode;
    emptyState?: ReactNode;
    loading?: boolean;
    loadingLabel?: string;
    storageKey?: string;
    cardGridClassName?: string;
};
/**
 * Generic card/list toggle for entity collections (services, ads, and future
 * resources). Presentation-only: callers supply `renderCard`/`renderRow` and
 * own data fetching, filtering and actions.
 */
export declare function EntityGridList<T>({ title, description, items, getKey, renderCard, renderRow, actions, emptyState, loading, loadingLabel, storageKey, cardGridClassName, }: Readonly<EntityGridListProps<T>>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=entity-grid-list.d.ts.map