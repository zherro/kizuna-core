'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { useResourceOptions } from '../../hooks';
/**
 * Carrossel de categorias com DADOS REAIS — busca a taxonomia do projeto
 * (`vw_category_subcategory_stats` do plugin taxonomy) e mostra só as categorias
 * que têm conteúdo. Duas caras: `classic` (cards largos com contador) e
 * `compact` (cards verticais pequenos com ícone em círculo). Tudo tokenizado.
 *
 * Uso:
 *   <CategoryCarousel variant="compact" title="Categorias" allHref="/busca" allLabel="Ver todas" />
 */
export function CategoryCarousel({ variant = 'classic', resource = 'category_stats', title = 'Categorias', allLabel, allHref, hrefFor = (c) => `/busca?categoryId=${c.id}`, iconFor = () => _jsx(Tag, { className: "h-5 w-5" }), countLabel = (n) => `${n} ${n === 1 ? 'subcategoria' : 'subcategorias'}`, emptyLabel = 'Nenhuma categoria disponível.', hideWhenEmpty = false, className, }) {
    const { options, loading } = useResourceOptions({ resource });
    const items = useMemo(() => {
        const map = new Map();
        for (const row of options ?? []) {
            const cid = Number(row.categoryId);
            if (!Number.isFinite(cid) || cid <= 0)
                continue;
            const name = String(row.categoryName ?? row.name ?? `Categoria ${cid}`);
            const entry = map.get(cid) ?? { id: cid, name, count: 0 };
            entry.count += 1;
            map.set(cid, entry);
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [options]);
    const empty = !loading && items.length === 0;
    if (empty && hideWhenEmpty)
        return null;
    const maxW = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
    const emptyBox = (_jsx("div", { className: "mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground", children: emptyLabel }));
    if (variant === 'compact') {
        return (_jsxs("section", { className: className ?? `${maxW} py-8`, children: [_jsx(Header, { title: title, allLabel: allLabel, allHref: allHref, compact: true }), empty ? (emptyBox) : (_jsx("div", { className: "mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: loading
                        ? Array.from({ length: 6 }).map((_, i) => (_jsx("div", { className: "h-[76px] w-20 shrink-0 animate-pulse rounded-2xl bg-muted" }, i)))
                        : items.map((c) => (_jsxs(Link, { href: hrefFor(c), className: "flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card py-3 text-center transition-transform active:scale-95", children: [_jsx("span", { className: "flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary", children: iconFor(c) }), _jsx("span", { className: "line-clamp-2 text-[11px] font-semibold text-foreground", children: c.name })] }, c.id))) }))] }));
    }
    return (_jsxs("section", { className: className ?? `${maxW} py-14`, children: [_jsx(Header, { title: title, allLabel: allLabel, allHref: allHref }), empty ? (emptyBox) : (_jsx("div", { className: "mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: loading
                    ? Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "h-[132px] min-w-[200px] animate-pulse rounded-2xl bg-muted" }, i)))
                    : items.map((c) => (_jsxs(Link, { href: hrefFor(c), className: "group flex min-w-[200px] snap-start flex-col gap-4 rounded-2xl border border-border/70 bg-muted/50 p-5 transition-colors hover:border-primary/40 hover:bg-primary/5", children: [_jsx("span", { className: "flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground", children: iconFor(c) }), _jsxs("span", { children: [_jsx("span", { className: "block font-medium leading-snug text-foreground", children: c.name }), _jsx("span", { className: "mt-1 block text-sm text-muted-foreground", children: countLabel(c.count) })] })] }, c.id))) }))] }));
}
function Header({ title, allLabel, allHref, compact, }) {
    return (_jsxs("div", { className: "flex items-end justify-between gap-4", children: [_jsx("h2", { className: compact
                    ? 'text-lg font-bold tracking-tight text-foreground'
                    : 'font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em] text-foreground', children: title }), allLabel && allHref ? (_jsx(Link, { href: allHref, className: "text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", children: allLabel })) : null] }));
}
//# sourceMappingURL=category-carousel.js.map