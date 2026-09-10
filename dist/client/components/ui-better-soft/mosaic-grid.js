'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import Link from 'next/link';
import { cn } from '../../../lib/utils';
function getSpanClass(span) {
    if (span === 'wide')
        return 'col-span-2 sm:col-span-2';
    if (span === 'tall')
        return 'row-span-2';
    if (span === 'large')
        return 'col-span-2 row-span-2 sm:col-span-2';
    return 'col-span-1';
}
function MosaicTile({ item, tileClassName, onItemClick, }) {
    const baseClassName = cn('group relative overflow-hidden rounded-2xl border border-border text-left', getSpanClass(item.span), tileClassName);
    const content = (_jsxs(_Fragment, { children: [_jsx("img", { src: item.image, alt: item.label, className: "absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" }), _jsxs("div", { className: "absolute inset-x-0 bottom-0 p-3 sm:p-4", children: [_jsx("p", { className: "text-base font-semibold text-white sm:text-lg", children: item.label }), item.hint ? _jsx("p", { className: "text-xs text-white/85 sm:text-sm", children: item.hint }) : null] })] }));
    if (item.href) {
        return (_jsx(Link, { href: item.href, className: baseClassName, children: content }));
    }
    return (_jsx("button", { type: "button", className: baseClassName, onClick: () => onItemClick?.(item), children: content }));
}
export function MosaicGrid({ items, className, tileClassName, onItemClick }) {
    return (_jsx("div", { className: cn('grid auto-rows-[148px] grid-cols-2 gap-3 sm:auto-rows-[170px] sm:grid-cols-4', className), children: items.map((item) => (_jsx(MosaicTile, { item: item, tileClassName: tileClassName, onItemClick: onItemClick }, item.id))) }));
}
//# sourceMappingURL=mosaic-grid.js.map