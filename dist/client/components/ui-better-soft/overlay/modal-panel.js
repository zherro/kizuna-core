'use client';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// soft-theme: lê activeTheme (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { activeTheme } from '../../../lib/ui-theme';
import { cn } from '../../../../lib/utils';
/**
 * Side panel that slides in from the right — same shape as shadcn's Sheet
 * (used e.g. by the ausencias-style reference page), rebuilt without a radix
 * dependency: a fixed backdrop + a fixed `inset-y-0 right-0` panel, full
 * width on mobile and capped at `sm:max-w-lg`, sliding in via a plain
 * transform transition.
 */
export function ModalPanel({ open, onClose, title, description, icon, children, footer, footerFixed = false, headerFixed = false, wide = false, anchor = 'side', dismissible = true, }) {
    const overlayRef = useRef(null);
    const [entered, setEntered] = useState(false);
    const isBottomSheet = anchor === 'bottom-sheet';
    useEffect(() => {
        if (!open) {
            setEntered(false);
            return;
        }
        const frame = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(frame);
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        if (!dismissible)
            return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose, dismissible]);
    if (!open)
        return null;
    return (_jsx("div", { ref: overlayRef, onClick: (event) => {
            if (dismissible && event.target === overlayRef.current)
                onClose();
        }, className: cn('fixed inset-0 z-50 transition-opacity duration-300', isBottomSheet
            ? 'flex items-end justify-center bg-foreground/40 px-4 pb-4'
            : 'bg-black/40 backdrop-blur-sm', entered ? 'opacity-100' : 'opacity-0'), children: _jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": title, className: isBottomSheet
                ? cn(activeTheme.bottomSheet, 'transition-transform duration-300 ease-out', entered ? 'translate-y-0' : 'translate-y-full')
                : cn('fixed inset-y-0 right-0 flex h-full w-full flex-col overflow-y-auto border-l border-border bg-background shadow-xl transition-transform duration-300 ease-out', wide ? 'min-[500px]:w-[90vw]' : 'sm:max-w-lg', entered ? 'translate-x-0' : 'translate-x-full'), children: [title ? (_jsxs("div", { className: cn(headerFixed && 'sticky top-0 z-40 bg-background/40 backdrop-blur', 'flex items-start justify-between gap-3', isBottomSheet ? 'mb-4' : 'border-b border-border px-5 py-4'), children: [_jsxs("div", { children: [_jsxs("h2", { className: "flex items-center gap-2 text-base font-bold", children: [icon, title] }), description ? (_jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: description })) : null] }), _jsx("button", { type: "button", onClick: onClose, "aria-label": "Fechar", className: "rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground", children: _jsx(X, { className: "h-4 w-4" }) })] })) : null, _jsx("div", { className: isBottomSheet ? 'flex-1' : 'flex-1 px-5 py-4', children: children }), footer ? (_jsx("div", { className: cn(footerFixed && 'sticky bottom-0 z-40 bg-background/40 backdrop-blur', 'flex flex-wrap justify-end gap-2', isBottomSheet ? 'mt-4' : 'border-t border-border px-5 py-4'), children: footer })) : null] }) }));
}
//# sourceMappingURL=modal-panel.js.map