'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '../../../../lib/utils';
function readStoredViewMode(storageKey) {
    if (typeof window === 'undefined')
        return 'card';
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'list' ? 'list' : 'card';
}
/**
 * Generic card/list toggle for entity collections (services, ads, and future
 * resources). Presentation-only: callers supply `renderCard`/`renderRow` and
 * own data fetching, filtering and actions.
 */
export function EntityGridList({ title, description, items, getKey, renderCard, renderRow, actions, emptyState, loading = false, loadingLabel = 'Carregando...', storageKey = 'entity-grid-view-mode', cardGridClassName = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3', }) {
    const [viewMode, setViewMode] = useState('card');
    useEffect(() => {
        setViewMode(readStoredViewMode(storageKey));
    }, [storageKey]);
    function selectViewMode(mode) {
        setViewMode(mode);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(storageKey, mode);
        }
    }
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-foreground", children: title }), description ? _jsx("p", { className: "text-sm text-muted-foreground", children: description }) : null] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "inline-flex items-center rounded-lg border border-border bg-muted/40 p-1", children: [_jsxs("button", { type: "button", onClick: () => selectViewMode('card'), "aria-label": "Visualizar em cards", className: cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition', viewMode === 'card'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'), children: [_jsx(LayoutGrid, { className: "h-4 w-4" }), " Cards"] }), _jsxs("button", { type: "button", onClick: () => selectViewMode('list'), "aria-label": "Visualizar em lista", className: cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition', viewMode === 'list'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'), children: [_jsx(List, { className: "h-4 w-4" }), " Lista"] })] }), actions] })] }), loading ? _jsx("p", { className: "text-sm text-muted-foreground", children: loadingLabel }) : null, !loading && items.length === 0 ? emptyState : null, !loading && items.length > 0 ? (viewMode === 'card' ? (_jsx("div", { className: cardGridClassName, children: items.map((item) => (_jsx("div", { children: renderCard(item) }, getKey(item)))) })) : (_jsx("div", { className: "space-y-3", children: items.map((item) => (_jsx("div", { children: renderRow(item) }, getKey(item)))) }))) : null] }));
}
//# sourceMappingURL=entity-grid-list.js.map