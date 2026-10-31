import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from 'next/link';
import { cn } from '../../../../lib/utils';
export function MediaResultCard({ image, imageAlt, badgeTopLeft, badgeTopRight, title, subtitle, leading, footer, href, className, }) {
    const content = (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative aspect-[3/2] w-full overflow-hidden bg-gradient-to-br from-brand-soft to-secondary", children: [image && (_jsx("img", { src: image, alt: imageAlt, loading: "lazy", className: "h-full w-full object-cover transition duration-500 group-hover:scale-105" })), badgeTopLeft && _jsx("div", { className: "absolute left-3 top-3", children: badgeTopLeft }), badgeTopRight && _jsx("div", { className: "absolute right-3 top-3", children: badgeTopRight })] }), _jsxs("div", { className: "flex flex-1 flex-col gap-3 p-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "line-clamp-2 text-base font-bold leading-tight", children: title }), subtitle && _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: subtitle })] }), leading, _jsx("div", { className: "mt-auto flex items-end justify-between gap-2 pt-1", children: footer })] })] }));
    const cardClassName = cn('group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg', className);
    if (href) {
        return (_jsx(Link, { href: href, className: cardClassName, children: content }));
    }
    return _jsx("article", { className: cardClassName, children: content });
}
//# sourceMappingURL=media-result-card.js.map