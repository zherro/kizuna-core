'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { requestModeration } from './use-reviews';
// i18n(track-e): reviews.moderation.request.*
const REASON_MAX = 800;
/**
 * Owner-only "ask for a re-review" flow. Sends `fn_review_moderation_request`;
 * a 403 (not the owner) surfaces as an inline message from the hook.
 */
export function ReviewModerationRequestModal({ open, onClose, reviewId, onSubmitted, }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!open)
            return;
        setReason('');
        setError('');
        setSubmitting(false);
    }, [open]);
    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError('Descreva o motivo da solicitação.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await requestModeration(reviewId, reason);
            onSubmitted?.();
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível enviar a solicitação.');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(ModalPanel, { open: open, onClose: onClose, icon: _jsx(Flag, { className: "h-4 w-4 text-amber-500" }), title: "Solicitar revis\u00E3o da avalia\u00E7\u00E3o", description: "A avalia\u00E7\u00E3o n\u00E3o ser\u00E1 editada nem removida \u2014 a modera\u00E7\u00E3o vai reanalisar o caso.", footerFixed: true, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: submitting, children: "Cancelar" }), _jsx(Button, { onClick: () => void handleSubmit(), disabled: submitting, children: submitting ? 'Enviando...' : 'Enviar solicitação' })] }), children: _jsxs("div", { className: "space-y-3", children: [_jsx("label", { htmlFor: "moderation-reason", className: "block text-sm font-medium", children: "Motivo" }), _jsx(Textarea, { id: "moderation-reason", value: reason, rows: 5, maxLength: REASON_MAX, disabled: submitting, onChange: (event) => setReason(event.target.value), placeholder: "Explique por que esta avalia\u00E7\u00E3o deveria ser reanalisada (ex.: informa\u00E7\u00E3o incorreta, ofensa, engano de servi\u00E7o)." }), _jsxs("span", { className: "block text-right text-xs text-muted-foreground", children: [reason.length, "/", REASON_MAX] }), error ? (_jsx("p", { className: "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive", children: error })) : null] }) }));
}
//# sourceMappingURL=review-moderation-request-modal.js.map