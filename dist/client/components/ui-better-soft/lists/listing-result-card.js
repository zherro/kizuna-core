import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { MediaResultCard } from './media-result-card';
function initials(name) {
    return (name ?? '').trim().slice(0, 2).toUpperCase();
}
function ProviderRow({ providerName, providerAvatarUrl, compact, }) {
    if (!providerName)
        return null;
    const size = compact ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-[10px]';
    return (_jsxs("div", { className: cn('flex items-center gap-2 rounded-lg border border-border bg-background/50', compact ? 'px-1.5 py-1' : 'px-2 py-1.5'), children: [providerAvatarUrl ? (_jsx("img", { src: providerAvatarUrl, alt: providerName, loading: "lazy", className: cn('shrink-0 rounded-full object-cover', size) })) : (_jsx("span", { className: cn('flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground', size), children: initials(providerName) })), _jsxs("span", { className: "flex-1 truncate text-[11px] font-semibold text-foreground", title: providerName, children: ["@", providerName] })] }));
}
export function ListingResultCard({ href, title, priceLabel, tagLabel, subtitleLabel, imageUrl, highlighted, highlightLabel = 'Destaque', providerName, providerAvatarUrl, ctaLabel = 'Ver', variant = 'grid', className, }) {
    if (variant === 'strip') {
        return (_jsxs(Link, { href: href, className: cn('group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md', className), children: [_jsxs("div", { className: "relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-soft to-secondary", children: [imageUrl && (_jsx("img", { src: imageUrl, alt: title, loading: "lazy", className: "h-full w-full object-cover transition duration-500 group-hover:scale-105" })), highlighted && (_jsxs("span", { className: "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white", children: [_jsx(Sparkles, { className: "h-3 w-3" }), " ", highlightLabel] }))] }), _jsxs("div", { className: "flex flex-1 flex-col gap-1 p-3", children: [_jsx("h3", { className: "line-clamp-1 text-sm font-bold leading-tight", children: title }), subtitleLabel && (_jsx("p", { className: "line-clamp-1 text-[11px] text-muted-foreground", children: subtitleLabel })), _jsx("div", { className: "mt-auto pt-1 text-sm font-black leading-none", children: priceLabel })] })] }));
    }
    return (_jsx(MediaResultCard, { className: className, href: href, image: imageUrl, imageAlt: title, title: title, subtitle: subtitleLabel ?? undefined, badgeTopLeft: highlighted ? (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white", children: [_jsx(Sparkles, { className: "h-3 w-3" }), " ", highlightLabel] })) : undefined, badgeTopRight: tagLabel ? (_jsx("span", { className: "inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow", children: tagLabel })) : undefined, leading: _jsx(ProviderRow, { providerName: providerName, providerAvatarUrl: providerAvatarUrl }), footer: _jsxs(_Fragment, { children: [_jsx("div", { className: "text-lg font-black leading-none", children: priceLabel }), _jsx("span", { className: "inline-flex shrink-0 items-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition group-hover:bg-brand/90", children: ctaLabel })] }) }));
}
//# sourceMappingURL=listing-result-card.js.map