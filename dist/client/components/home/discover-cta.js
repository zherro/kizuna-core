'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { cn } from '../../../lib/utils';
/**
 * Banner-CTA de destaque (gradiente da cor primária) — ex.: "Descobrir no swipe".
 * Tudo tokenizado (`from-primary` / `text-primary-foreground`), sem classe
 * custom. Texto e destino são props. Ligado por env (KIZUNA_HOME_DISCOVER).
 */
export function DiscoverCta({ href = '/descobrir', title = 'Descobrir no swipe', subtitle = 'Arraste: esse não, esse sim. Monte sua agenda em segundos.', icon = _jsx(Flame, { className: "h-6 w-6" }), contained = true, className, }) {
    const link = (_jsxs(Link, { href: href, className: cn(
        // gradiente sutil, horizontal, dentro da cor primária (sem virar laranja no fim)
        'flex items-center gap-4 overflow-hidden rounded-2xl bg-primary bg-[linear-gradient(90deg,var(--primary),color-mix(in_oklch,var(--primary),black_14%))] p-5 shadow-lg shadow-primary/25 transition-transform active:scale-[0.99]', className), children: [_jsx("span", { className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/25 text-primary-foreground", children: icon }), _jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "block text-lg font-bold text-primary-foreground", children: title }), _jsx("span", { className: "block text-sm text-primary-foreground/90", children: subtitle })] }), _jsx(ArrowRight, { className: "ml-auto h-5 w-5 shrink-0 text-primary-foreground" })] }));
    if (!contained)
        return link;
    return _jsx("div", { className: "mx-auto w-full max-w-6xl px-4 sm:px-6", children: link });
}
//# sourceMappingURL=discover-cta.js.map