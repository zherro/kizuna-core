'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../providers/auth-provider';
import { RatingInput } from './rating-input';
import { ReviewTags } from './review-tags';
import { submitReview, useReviewTags } from './use-reviews';
// i18n(track-e): reviews.modal.*
const COMMENT_MAX = 1000;
export function ReviewModal({ open, onClose, domain, serviceId, customerId, existingReview, onSubmitted, }) {
    void customerId;
    const { user } = useAuth();
    const { tags, loading: tagsLoading } = useReviewTags(domain);
    const selectableTags = useMemo(() => tags.filter((tag) => tag.selectable && tag.active), [tags]);
    const isEdit = Boolean(existingReview);
    const [rating, setRating] = useState(existingReview?.rating ?? 0);
    const [comment, setComment] = useState(existingReview?.comment ?? '');
    const [selectedSlugs, setSelectedSlugs] = useState(existingReview?.tags.map((t) => t.slug) ?? []);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (!open)
            return;
        setRating(existingReview?.rating ?? 0);
        setComment(existingReview?.comment ?? '');
        setSelectedSlugs(existingReview?.tags.map((t) => t.slug) ?? []);
        setError('');
        setSubmitting(false);
    }, [open, existingReview]);
    const toggleTag = (slug) => {
        setSelectedSlugs((current) => current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
    };
    const handleSubmit = async () => {
        if (rating < 1) {
            setError('Escolha uma nota de 1 a 5.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const tagIds = selectableTags
                .filter((tag) => selectedSlugs.includes(tag.slug))
                .map((tag) => tag.id);
            const result = await submitReview({
                domain,
                referenceId: serviceId,
                rating,
                comment,
                tagIds,
                existingReviewId: existingReview?.id,
            });
            onSubmitted?.(result);
            onClose();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível enviar sua avaliação.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const unauthorized = !user;
    return (_jsx(ModalPanel, { open: open, onClose: onClose, icon: _jsx(Star, { className: "h-4 w-4 text-amber-500" }), title: isEdit ? 'Editar minha avaliação' : 'Avaliar este serviço', description: isEdit
            ? 'Você pode ajustar a nota e o comentário dentro do prazo de edição.'
            : 'Conte como foi sua experiência para ajudar outras pessoas.', headerFixed: true, footerFixed: true, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: submitting, children: "Cancelar" }), _jsx(Button, { onClick: () => void handleSubmit(), disabled: submitting || unauthorized, children: submitting ? 'Enviando...' : isEdit ? 'Salvar alterações' : 'Enviar avaliação' })] }), children: unauthorized ? (_jsxs("div", { className: "rounded-lg border border-border bg-muted/40 p-4 text-sm", children: [_jsx("p", { className: "font-medium", children: "Entre para avaliar" }), _jsx("p", { className: "mt-1 text-muted-foreground", children: "\u00C9 preciso ter uma conta para deixar uma avalia\u00E7\u00E3o." }), _jsx("a", { href: "/login", className: "mt-3 inline-flex text-sm font-medium text-primary underline-offset-2 hover:underline", children: "Ir para o login" })] })) : (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("span", { className: "mb-1.5 block text-sm font-medium", children: "Sua nota" }), _jsx(RatingInput, { value: rating, onChange: setRating, size: "lg", disabled: submitting })] }), _jsxs("div", { children: [_jsxs("span", { className: "mb-1.5 block text-sm font-medium", children: ["O que se destacou? ", _jsx("span", { className: "text-muted-foreground", children: "(opcional)" })] }), tagsLoading ? (_jsx("div", { className: "h-8 w-48 animate-pulse rounded bg-muted", "aria-hidden": "true" })) : selectableTags.length ? (_jsx(ReviewTags, { tags: selectableTags, selected: selectedSlugs, onToggle: toggleTag })) : (_jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhuma tag dispon\u00EDvel." }))] }), _jsxs("div", { children: [_jsxs("label", { htmlFor: "review-comment", className: "mb-1.5 block text-sm font-medium", children: ["Coment\u00E1rio ", _jsx("span", { className: "text-muted-foreground", children: "(opcional)" })] }), _jsx(Textarea, { id: "review-comment", value: comment, maxLength: COMMENT_MAX, disabled: submitting, rows: 4, onChange: (event) => setComment(event.target.value), placeholder: "Descreva com detalhes como foi o atendimento, o prazo, a qualidade..." }), _jsxs("span", { className: "mt-1 block text-right text-xs text-muted-foreground", children: [comment.length, "/", COMMENT_MAX] })] }), error ? (_jsx("p", { className: "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive", children: error })) : null] })) }));
}
//# sourceMappingURL=review-modal.js.map