'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Grid } from '../ui/grid';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn } from '../../../lib/utils';
import { TONE_BG, TONE_BORDER_L } from '../../../lib/ui-tone';
function getRowKey(item, index, config) {
    if (config.getRowKey) {
        return config.getRowKey(item, index);
    }
    const candidate = item;
    if (typeof candidate.id === 'string' || typeof candidate.id === 'number') {
        return candidate.id;
    }
    return index;
}
function toIconNode(icon) {
    if (icon === 'edit')
        return _jsx(Pencil, { className: "h-4 w-4" });
    if (icon === 'delete')
        return _jsx(Trash2, { className: "h-4 w-4" });
    return icon;
}
function renderActionItems(item, actions) {
    return actions.map((action, index) => {
        const key = `${action.type}-${action.label}-${index}`;
        const isLoading = typeof action.loading === 'function' ? action.loading(item) : Boolean(action.loading);
        const disabled = typeof action.disabled === 'function' ? action.disabled(item) : Boolean(action.disabled);
        const resolvedIcon = typeof action.icon === 'function' ? action.icon(item) : action.icon;
        const icon = toIconNode(resolvedIcon);
        const label = isLoading && action.loadingLabel ? action.loadingLabel : action.label;
        const variant = action.variant ?? 'outline';
        const size = action.size ?? 'sm';
        const intentClass = action.intent === 'danger'
            ? 'border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40'
            : undefined;
        if (action.type === 'link') {
            const href = action.getHref ? action.getHref(item) : action.href;
            if (!href)
                return null;
            return (_jsxs(Link, { href: href, className: cn(buttonVariants({ variant, size }), 'gap-2', intentClass, action.className), children: [icon, label] }, key));
        }
        return (_jsxs(Button, { type: "button", variant: variant, size: size, disabled: disabled || isLoading, onClick: () => {
                if (!action.onClick)
                    return;
                void action.onClick(item);
            }, className: cn('gap-2', intentClass, action.className), children: [icon, label] }, key));
    });
}
export function ResponsiveResourceTable({ table, config, onBeforeSearch, }) {
    const searchButtonLabel = config.searchButtonLabel ?? 'Buscar';
    const emptyMessage = config.emptyMessage ?? 'Nenhum registro encontrado.';
    return (_jsxs(Card, { className: cn(config.className, !config.title && !config.description && 'pt-4'), children: [(config.title || config.description) && (_jsxs(CardHeader, { children: [config.title ? _jsx(CardTitle, { children: config.title }) : null, config.description ? _jsx(CardDescription, { children: config.description }) : null] })), _jsxs(CardContent, { children: [_jsx("form", { className: "mb-4", onSubmit: (event) => {
                            void (async () => {
                                await onBeforeSearch?.();
                                await table.submitSearch(event);
                            })();
                        }, children: _jsxs(Grid, { container: true, gap: 3, className: "items-end", children: [_jsx(Grid, { xs: 12, md: 9, children: _jsx(Input, { ...table.searchInputProps, placeholder: config.searchPlaceholder ?? 'Buscar', className: "w-full" }) }), _jsx(Grid, { xs: 12, md: 3, children: _jsxs("div", { className: "flex w-full flex-wrap gap-2 md:justify-end", children: [_jsx(Button, { type: "button", variant: "outline", className: "w-full md:w-auto", disabled: !table.search.trim() && table.page === 1, onClick: () => {
                                                    table.setSearch('');
                                                    void table.load(1, '');
                                                }, children: "Limpar" }), _jsx(Button, { type: "submit", variant: "outline", className: "w-full md:w-auto", children: searchButtonLabel })] }) })] }) }), table.error ? (_jsx("p", { className: "mb-4 text-sm text-red-600 dark:text-red-300", children: table.error })) : null, table.total > 0 || table.loading ? (_jsxs("div", { className: "mb-4 flex items-center justify-between text-sm text-muted-foreground", children: [_jsx("span", { children: table.loading ? 'Carregando...' : '' }), _jsxs("span", { children: ["P\u00E1gina ", table.page, table.totalPages > 0 ? ` de ${table.totalPages}` : ''] })] })) : null, _jsxs("div", { className: "grid grid-cols-1 gap-2.5 md:hidden", children: [!table.loading && table.items.length === 0 ? (_jsx("div", { className: "rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground", children: emptyMessage })) : null, table.items.map((item, index) => {
                                const tone = config.getRowTone?.(item);
                                return (_jsxs("div", { className: cn('rounded-xl border border-l-4 border-border bg-background p-3.5 shadow-sm', tone ? TONE_BORDER_L[tone] : 'border-l-border'), children: [_jsx("div", { className: "space-y-2.5", children: config.columns.map((column) => (_jsxs("div", { children: [_jsx("p", { className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", children: column.mobileLabel ?? column.header }), _jsx("div", { className: "mt-0.5 text-sm text-foreground", children: column.render(item) })] }, column.key))) }), config.actions ? (_jsx("div", { className: "mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3", children: config.actions.items?.length
                                                ? renderActionItems(item, config.actions.items)
                                                : (config.actions.mobileRender?.(item) ??
                                                    config.actions.render?.(item) ??
                                                    null) })) : null] }, getRowKey(item, index, config)));
                            })] }), _jsx("div", { className: "hidden overflow-hidden rounded-xl border border-border md:block", children: _jsxs(Table, { className: "rounded-none border-0", children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "hover:bg-transparent", children: [config.getRowTone ? _jsx(TableHead, { className: "w-1 p-0" }) : null, config.columns.map((column) => (_jsx(TableHead, { className: cn('text-[11px] font-semibold uppercase tracking-wide text-muted-foreground', column.className), children: column.header }, column.key))), config.actions ? (_jsx(TableHead, { className: cn('text-[11px] font-semibold uppercase tracking-wide text-muted-foreground', config.actions.className), children: config.actions.header ?? 'Ações' })) : null] }) }), _jsxs(TableBody, { children: [!table.loading && table.items.length === 0 ? (_jsx(TableRow, { className: "hover:bg-transparent", children: _jsx(TableCell, { colSpan: config.columns.length + (config.actions ? 1 : 0) + (config.getRowTone ? 1 : 0), className: "py-8 text-center text-muted-foreground", children: emptyMessage }) })) : null, table.items.map((item, index) => {
                                            const tone = config.getRowTone?.(item);
                                            return (_jsxs(TableRow, { children: [config.getRowTone ? (_jsx(TableCell, { className: cn('w-1 p-0', tone ? TONE_BG[tone] : 'bg-transparent') })) : null, config.columns.map((column) => (_jsx(TableCell, { className: cn('align-top', column.className), children: column.render(item) }, column.key))), config.actions ? (_jsx(TableCell, { className: cn('align-top', config.actions.className), children: config.actions.items?.length ? (_jsx("div", { className: "flex gap-2", children: renderActionItems(item, config.actions.items) })) : ((config.actions.render?.(item) ?? null)) })) : null] }, getRowKey(item, index, config)));
                                        })] })] }) }), table.total > 0 ? (_jsxs(Grid, { container: true, gap: 3, className: "mt-4 border-t pt-4", children: [_jsx(Grid, { xs: 12, md: 6, className: "flex items-center", children: _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Mostrando ", table.items.length, " de ", table.total, " registro", table.total === 1 ? '' : 's', "."] }) }), _jsx(Grid, { xs: 12, md: 6, className: "flex justify-start md:justify-end", children: _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", variant: "outline", disabled: !table.canGoPrevious || table.loading, onClick: () => void table.goToPage(table.page - 1), children: "Anterior" }), _jsx(Button, { type: "button", variant: "outline", disabled: !table.canGoNext || table.loading, onClick: () => void table.goToPage(table.page + 1), children: "Pr\u00F3xima" })] }) })] })) : null] })] }));
}
//# sourceMappingURL=responsive-resource-table.js.map