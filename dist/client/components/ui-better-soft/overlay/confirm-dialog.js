'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', loading = false, onConfirm, onCancel, }) {
    const overlayRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                onCancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onCancel]);
    if (!open)
        return null;
    return (_jsx("div", { ref: overlayRef, onClick: (event) => {
            if (event.target === overlayRef.current)
                onCancel();
        }, className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm", children: _jsxs("div", { role: "alertdialog", "aria-modal": "true", "aria-label": title, className: "w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive", children: _jsx(AlertTriangle, { className: "h-4 w-4" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-sm font-bold", children: title }), description ? (_jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: description })) : null] })] }), _jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onCancel, disabled: loading, children: cancelLabel }), _jsx(Button, { type: "button", onClick: onConfirm, disabled: loading, className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: loading ? 'Removendo...' : confirmLabel })] })] }) }));
}
//# sourceMappingURL=confirm-dialog.js.map