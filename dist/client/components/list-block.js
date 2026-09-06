'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import { Briefcase, ClipboardCheck, MapPin, Pencil, Plus, Package, Sparkles, Zap, } from 'lucide-react';
import { Button, buttonVariants } from './ui/button';
import { Input } from './ui/input';
import { EmptyStateCard } from './ui-better-soft/lists/empty-state-card';
import { useTable } from '../hooks';
import { postgrestResources } from '@/lib/server/resources';
import { formatServicePrice } from '@/components/services/service-type';
import { cn } from '../../lib/utils';
import { TONE_BADGE } from '../../lib/ui-tone';
/**
 * `block.props` crosses a Server Component → Client Component boundary
 * (`RenderScreen` → `ListBlock`, see `render-screen.tsx`) — React can only
 * serialize plain data across it, never a function or a component reference
 * (icon, formatter). `screens/*.ts` (server-loaded config modules) embed
 * both indirectly instead: every icon below is a string key resolved
 * against `ICON_MAP` (this file only, never sent through props), and every
 * per-field formatter is a `FieldFormat` — data describing *which*
 * built-in formatting rule to apply, not a function that applies it.
 *
 * Card markup is a 1:1 port of the pre-migration `ListBlock`
 * (`grid grid-cols-[minmax(0,1fr)_auto]`, soft-filled status pill, muted
 * `·`-separated meta row, bold right-aligned stat + uppercase caption,
 * solid-brand action button) — match its classes exactly rather than
 * approximating.
 */
const ICON_MAP = {
    Briefcase,
    ClipboardCheck,
    MapPin,
    Pencil,
    Sparkles,
    Zap,
};
const ACTION_ICON_MAP = {
    edit: 'Pencil',
    review: 'ClipboardCheck',
};
/** Named formatters that need real domain logic (not expressible as plain data) — keyed by name so `screens/*.ts` can reference one without importing/passing a function. */
const NAMED_FORMATTERS = {
    servicePrice: (value, item) => formatServicePrice(Number(value) || 0, String(item.priceUnit ?? 'quote')),
};
function formatFieldValue(format, value, item) {
    switch (format.type) {
        case 'text':
            return value == null ? '' : String(value);
        case 'fallback':
            return value ? String(value) : format.fallback;
        case 'relationName': {
            const relation = value;
            return relation?.name ? String(relation.name) : format.fallback;
        }
        case 'enum': {
            const key = value == null ? '' : String(value);
            return format.labels[key] ?? format.fallback ?? key;
        }
        case 'boolean':
            return value ? format.trueLabel : (format.falseLabel ?? '');
        case 'named':
            return NAMED_FORMATTERS[format.name]?.(value, item) ?? String(value ?? '');
        default:
            return String(value ?? '');
    }
}
function fieldTone(format, value) {
    if (format.type !== 'enum')
        return 'muted';
    const key = value == null ? '' : String(value);
    return format.tones?.[key] ?? 'muted';
}
/**
 * Checks onboarding completion by calling the existing generic RPC route
 * (`/api/postgrest/rpc`) with the already-registered `fn_is_onboarding_completed`
 * function (see `postgrestRpcs` in `@/lib/server/resources`) — no new API
 * surface, just the same call a server component would make, done from the
 * client. Fails open (returns `true`) on any error so a broken check never
 * traps the user behind a gate that can't be evaluated.
 */
async function isOnboardingCompleted() {
    try {
        const response = await fetch('/api/postgrest/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schema: 'public',
                functionName: 'fn_is_onboarding_completed',
                params: {},
            }),
        });
        if (!response.ok)
            return true;
        const data = (await response.json().catch(() => null));
        const payload = data?.payload;
        if (typeof payload === 'boolean')
            return payload;
        if (Array.isArray(payload)) {
            const first = payload[0];
            if (typeof first === 'boolean')
                return first;
            if (first && typeof first === 'object') {
                return Boolean(Object.values(first)[0]);
            }
            return true;
        }
        if (payload && typeof payload === 'object') {
            return Boolean(Object.values(payload)[0]);
        }
        return true;
    }
    catch {
        return true;
    }
}
/**
 * `href` link that, when `gateUserId` is set, checks onboarding completion on click instead of
 * navigating straight away — plain `Link` when `gateUserId` is undefined (ungated screens pay
 * nothing extra). Incomplete → redirects to the onboarding screen instead of the create flow,
 * never lets the click through. The check runs on demand (not on mount) since it's only needed
 * at the moment of the click.
 */
function GatedCreateLink({ href, gateUserId, className, children, }) {
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    async function handleClick(event) {
        if (!gateUserId || checking)
            return;
        event.preventDefault();
        setChecking(true);
        try {
            const completed = await isOnboardingCompleted();
            router.push(completed ? href : '/painel/onboarding?motivo=novo-servico');
        }
        catch {
            // Check itself failed (network/RPC error) — fail open rather than trap the user behind a
            // gate that can't be evaluated.
            router.push(href);
        }
        finally {
            setChecking(false);
        }
    }
    return (_jsx(Link, { href: href, onClick: handleClick, className: cn(className, checking && 'opacity-70'), children: children }));
}
export function ListBlock({ config }) {
    const resourceConfig = postgrestResources[config.resource];
    if (!resourceConfig) {
        return _jsxs("div", { className: "text-red-600", children: ["Resource \"", config.resource, "\" not configured"] });
    }
    const displayConfig = config.displayConfig;
    const Icon = (displayConfig?.icon && ICON_MAP[displayConfig.icon]) || Package;
    const singularName = displayConfig?.singularName || 'Item';
    const fields = displayConfig?.fields || {};
    const badgeFields = displayConfig?.badgeFields || [];
    const visibleFields = displayConfig?.visibleFields || [];
    const statField = displayConfig?.statField ? fields[displayConfig.statField] : undefined;
    const statFieldName = displayConfig?.statField;
    const ActionIcon = config.action.icon && ICON_MAP[ACTION_ICON_MAP[config.action.icon]];
    const [statusFilter, setStatusFilter] = useState(config.statusFilter?.defaultValue ?? '');
    const fixedFilters = config.fixedFilters;
    const filters = useMemo(() => {
        const merged = {};
        for (const [field, value] of Object.entries(fixedFilters ?? {})) {
            if (value)
                merged[field] = value;
        }
        if (statusFilter)
            merged.status = statusFilter;
        return Object.keys(merged).length > 0 ? merged : undefined;
    }, [statusFilter, fixedFilters]);
    const { items, loading, search, setSearch, page, total, totalPages, goToPage, submitSearch } = useTable({
        resource: config.resource,
        pageSize: config.pageSize ?? 10,
        orderBy: resourceConfig.defaultOrder ?? 'created_at',
        orderDirection: 'desc',
        filters,
    });
    const isUnfiltered = !statusFilter && !search;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [config.title ? (_jsx("h2", { className: "text-base font-semibold text-foreground", children: config.title })) : null, _jsx("p", { className: "text-sm text-muted-foreground", children: loading
                                    ? 'Carregando...'
                                    : `${total} registro${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}.` })] }), config.createAction ? (_jsxs(GatedCreateLink, { href: config.createAction.href, gateUserId: config.createGateUserId, className: buttonVariants({ size: 'sm' }), children: [_jsx(Plus, { className: "h-3.5 w-3.5" }), config.createAction.label] })) : null] }), _jsxs("form", { onSubmit: (event) => void submitSearch(event), className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx(Input, { value: search, onChange: (event) => setSearch(event.target.value), placeholder: `Buscar por ${resourceConfig.searchableColumns?.join(' ou ')}`, className: "flex-1" }), config.statusFilter ? (_jsx("div", { className: "w-full sm:w-56", children: _jsx(Button, { type: "button", variant: "outline", onClick: () => setStatusFilter(statusFilter ? '' : 'pending'), children: statusFilter ? 'Filtrar: Pendentes' : 'Sem filtro' }) })) : null, _jsx(Button, { type: "submit", variant: "outline", children: "Buscar" })] }), loading ? (_jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "Carregando..." })) : items.length === 0 ? (_jsx(EmptyStateCard, { icon: Icon, title: config.emptyState && isUnfiltered
                    ? (config.emptyState.message ?? `Nenhum ${singularName} cadastrado ainda.`)
                    : `Nenhum ${singularName} encontrado`, description: config.emptyState && isUnfiltered
                    ? `Cadastre seu primeiro ${singularName.toLowerCase()} para começar.`
                    : 'Ajuste a busca ou filtros.', action: config.emptyState?.ctaHref && isUnfiltered ? (_jsxs(GatedCreateLink, { href: config.emptyState.ctaHref, gateUserId: config.createGateUserId, className: buttonVariants(), children: [_jsx(Plus, { className: "h-4 w-4" }), config.emptyState.ctaLabel ?? `Criar ${singularName.toLowerCase()}`] })) : undefined })) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: "grid gap-2.5", children: items.map((item) => (_jsxs("li", { className: "group rounded-xl border border-border bg-card p-4 transition-all hover:border-brand/30 hover:shadow-sm", children: [_jsxs("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "truncate text-[15px] font-semibold leading-tight", children: String(item.title || item.name || 'Sem título') }), _jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground", children: [badgeFields.map((fieldName) => {
                                                            const field = fields[fieldName];
                                                            if (!field)
                                                                return null;
                                                            const value = item[fieldName];
                                                            const label = formatFieldValue(field.format, value, item);
                                                            if (!label)
                                                                return null;
                                                            const tone = fieldTone(field.format, value);
                                                            return (_jsx("span", { className: cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', TONE_BADGE[tone]), children: label }, fieldName));
                                                        }), visibleFields.map((fieldName, idx) => {
                                                            const field = fields[fieldName];
                                                            if (!field)
                                                                return null;
                                                            const value = item[fieldName];
                                                            const formatted = formatFieldValue(field.format, value, item);
                                                            const FieldIcon = field.icon ? ICON_MAP[field.icon] : undefined;
                                                            return (_jsxs(Fragment, { children: [idx > 0 && _jsx("span", { className: "text-border", children: "\u00B7" }), _jsxs("span", { className: "inline-flex min-w-0 items-center gap-1", children: [FieldIcon ? (_jsx(FieldIcon, { className: "h-3 w-3 shrink-0", "aria-hidden": "true" })) : null, _jsx("span", { className: "truncate", children: formatted })] })] }, fieldName));
                                                        })] })] }), statField && statFieldName ? (_jsxs("div", { className: "min-w-0 text-left sm:text-right", children: [_jsx("div", { className: "text-base font-bold tabular-nums text-foreground", children: formatFieldValue(statField.format, item[statFieldName], item) }), _jsx("div", { className: "text-[10px] uppercase tracking-wide text-muted-foreground", children: statField.label })] })) : null] }), _jsx("div", { className: "mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end", children: _jsxs(Link, { href: `${config.action.hrefBase}/${item.id}`, className: cn(buttonVariants({ size: 'sm' }), 'h-8 w-full justify-center bg-brand text-xs text-brand-foreground hover:bg-brand/90 sm:w-auto'), children: [ActionIcon ? _jsx(ActionIcon, { className: "h-3.5 w-3.5" }) : null, config.action.label] }) })] }, String(item.id)))) }), _jsxs("div", { className: "flex items-center justify-between border-t border-border pt-3", children: [_jsxs("p", { className: "text-xs text-muted-foreground", children: ["P\u00E1gina ", page, " de ", totalPages || 1] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => void goToPage(page - 1), disabled: page <= 1 || loading, children: "Anterior" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => void goToPage(page + 1), disabled: totalPages === 0 || page >= totalPages || loading, children: "Pr\u00F3xima" })] })] })] }))] }));
}
//# sourceMappingURL=list-block.js.map