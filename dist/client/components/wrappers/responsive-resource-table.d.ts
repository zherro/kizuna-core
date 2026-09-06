import type { ReactNode } from 'react';
import { type ButtonProps } from '../ui/button';
import type { UseTableResult } from '@kizuna/core';
import { type ThemeTone } from '../../../lib/ui-tone';
export type ResponsiveTableColumn<TItem> = {
    key: string;
    header: string;
    render: (item: TItem) => ReactNode;
    mobileLabel?: string;
    className?: string;
};
export type ResponsiveTableActions<TItem> = {
    header?: string;
    className?: string;
    items?: ResponsiveTableActionItem<TItem>[];
    render?: (item: TItem) => ReactNode;
    mobileRender?: (item: TItem) => ReactNode;
};
type ResponsiveTableActionIconPreset = 'edit' | 'delete';
export type ResponsiveTableActionItem<TItem> = {
    type: 'link' | 'button';
    label: string;
    loadingLabel?: string;
    href?: string;
    getHref?: (item: TItem) => string;
    onClick?: (item: TItem) => void | Promise<void>;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
    intent?: 'default' | 'danger';
    className?: string;
    icon?: ReactNode | ResponsiveTableActionIconPreset | ((item: TItem) => ReactNode | ResponsiveTableActionIconPreset);
    disabled?: boolean | ((item: TItem) => boolean);
    loading?: boolean | ((item: TItem) => boolean);
};
/** Alias kept for this file's own readability — the tone vocabulary itself (and its colors) live
 * in `src/lib/ui-tone.ts`, shared with `services-list-block.tsx`/`entity-list-card.tsx`. */
export type ResponsiveTableRowTone = ThemeTone;
export type ResponsiveResourceTableConfig<TItem> = {
    title?: string;
    description?: ReactNode;
    searchPlaceholder?: string;
    searchButtonLabel?: string;
    emptyMessage?: ReactNode;
    columns: ResponsiveTableColumn<TItem>[];
    actions?: ResponsiveTableActions<TItem>;
    getRowKey?: (item: TItem, index: number) => string | number;
    className?: string;
    /** Optional per-row semantic tone — tints a left accent strip on both the mobile card and the
     * desktop row. Return `undefined` for a row that doesn't need one (renders a neutral strip). */
    getRowTone?: (item: TItem) => ResponsiveTableRowTone | undefined;
};
type ResponsiveResourceTableProps<TItem> = {
    table: UseTableResult<TItem>;
    config: ResponsiveResourceTableConfig<TItem>;
    onBeforeSearch?: () => void | Promise<void>;
};
export declare function ResponsiveResourceTable<TItem>({ table, config, onBeforeSearch, }: ResponsiveResourceTableProps<TItem>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=responsive-resource-table.d.ts.map