'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { buttonVariants } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../../lib/utils';
import { useTable } from '../../hooks';
import { RatingDisplay } from './rating-display';
// i18n(track-e): reviews.moderation.table.*
const STATUS_OPTIONS = [
    { id: '', label: 'Todos os status' },
    { id: 'pending', label: 'Pendentes' },
    { id: 'published', label: 'Publicadas' },
    { id: 'hidden', label: 'Ocultas' },
    { id: 'rejected', label: 'Rejeitadas' },
];
const PERIOD_OPTIONS = [
    { id: '', label: 'Qualquer data' },
    { id: '7', label: 'Últimos 7 dias' },
    { id: '30', label: 'Últimos 30 dias' },
    { id: '90', label: 'Últimos 90 dias' },
];
const STATUS_TONE = {
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    published: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    hidden: 'bg-muted text-muted-foreground',
    rejected: 'bg-destructive/15 text-destructive',
};
function str(row, ...keys) {
    for (const key of keys) {
        const v = row[key];
        if (v !== undefined && v !== null && v !== '')
            return String(v);
    }
    return '';
}
/**
 * Bespoke screen-engine block (`review-moderation`). Lists `reviews` for
 * moderators via `useTable` with status / period / domain / reference_id / search
 * filters. `config` is plain serializable data only (crosses the RSC boundary).
 */
export function ReviewModerationTable({ config = {}, }) {
    const hrefBase = config.hrefBase ?? '/painel/administracao/avaliacoes';
    const [status, setStatus] = useState('');
    const [period, setPeriod] = useState('');
    const [domain, setDomain] = useState(config.domain ?? '');
    const [referenceId, setReferenceId] = useState('');
    const filters = useMemo(() => {
        const merged = {};
        if (status)
            merged.status = status;
        if (domain)
            merged.domain = domain;
        if (referenceId.trim())
            merged.reference_id = referenceId.trim();
        if (period) {
            const since = new Date();
            since.setDate(since.getDate() - Number(period));
            merged['created_at.gte'] = since.toISOString();
        }
        return Object.keys(merged).length ? merged : undefined;
    }, [status, domain, referenceId, period]);
    const table = useTable({
        resource: 'reviews',
        pageSize: config.pageSize ?? 20,
        orderBy: 'created_at',
        orderDirection: 'desc',
        filters,
    });
    const { goToPage } = table;
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        void goToPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);
    return (_jsxs("div", { className: "space-y-4", children: [config.title ? (_jsx("h2", { className: "text-base font-semibold text-foreground", children: config.title })) : null, _jsxs("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx("select", { value: status, onChange: (e) => setStatus(e.target.value), className: "h-9 rounded-md border border-input bg-background px-2 text-sm", children: STATUS_OPTIONS.map((o) => (_jsx("option", { value: o.id, children: o.label }, o.id))) }), _jsx("select", { value: period, onChange: (e) => setPeriod(e.target.value), className: "h-9 rounded-md border border-input bg-background px-2 text-sm", children: PERIOD_OPTIONS.map((o) => (_jsx("option", { value: o.id, children: o.label }, o.id))) }), _jsx("input", { value: domain, onChange: (e) => setDomain(e.target.value), placeholder: "Dom\u00EDnio (ex.: service)", className: "h-9 rounded-md border border-input bg-background px-2 text-sm" }), _jsx("input", { value: referenceId, onChange: (e) => setReferenceId(e.target.value), placeholder: "ID de refer\u00EAncia", className: "h-9 rounded-md border border-input bg-background px-2 text-sm" })] }), _jsx("form", { ...table.searchFormProps, children: _jsx("input", { ...table.searchInputProps, placeholder: "Buscar por coment\u00E1rio...", className: "h-9 w-full rounded-md border border-input bg-background px-3 text-sm" }) }), table.loading ? (_jsx("div", { className: "space-y-2", "aria-hidden": "true", children: [0, 1, 2, 3].map((i) => (_jsx("div", { className: "h-16 animate-pulse rounded-lg bg-muted" }, i))) })) : table.error ? (_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm", children: [_jsx("span", { className: "text-muted-foreground", children: table.error }), _jsx("button", { type: "button", onClick: () => void table.refresh(), className: "font-medium text-primary hover:underline", children: "Tentar de novo" })] })) : table.items.length === 0 ? (_jsx("div", { className: "rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground", children: "Nenhuma avalia\u00E7\u00E3o para os filtros atuais." })) : (_jsx("ul", { className: "space-y-2", children: table.items.map((row) => {
                    const id = str(row, 'id');
                    const rowStatus = str(row, 'status') || 'published';
                    const comment = str(row, 'comment');
                    return (_jsxs("li", { className: "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3", children: [_jsx(RatingDisplay, { value: Number(str(row, 'rating') || 0), size: "sm" }), _jsx(Badge, { variant: "secondary", className: cn('shrink-0', STATUS_TONE[rowStatus] ?? ''), children: rowStatus }), _jsx("span", { className: "min-w-0 flex-1 truncate text-sm text-muted-foreground", children: comment || 'Sem comentário' }), _jsxs("span", { className: "shrink-0 text-xs text-muted-foreground", children: [str(row, 'domain') || '—', " \u00B7 ", str(row, 'referenceId', 'reference_id') || '—'] }), _jsx(Link, { href: `${hrefBase}/${id}`, className: buttonVariants({ variant: 'outline', size: 'sm', className: 'shrink-0' }), children: "Analisar" })] }, id));
                }) })), table.totalPages > 1 ? (_jsxs("div", { className: "flex items-center justify-between pt-1", children: [_jsx("button", { type: "button", disabled: !table.canGoPrevious, onClick: () => void table.goToPage(table.page - 1), className: buttonVariants({ variant: 'outline', size: 'sm' }), children: "Anterior" }), _jsxs("span", { className: "text-xs text-muted-foreground", children: ["P\u00E1gina ", table.page, " de ", table.totalPages] }), _jsx("button", { type: "button", disabled: !table.canGoNext, onClick: () => void table.goToPage(table.page + 1), className: buttonVariants({ variant: 'outline', size: 'sm' }), children: "Pr\u00F3xima" })] })) : null] }));
}
//# sourceMappingURL=review-moderation-table.js.map