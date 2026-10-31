'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { DynamicStepForm } from '../../dynamic-step-form';
const DECISION_OPTIONS = [
    { value: 'approved', label: 'Aprovar' },
    { value: 'rejected', label: 'Rejeitar' },
    { value: 'escalated', label: 'Escalar para outro revisor' },
];
// Matches the ad_reviews / service_moderations rejection CHECK constraint.
const REJECTION_REASON_OPTIONS = [
    { value: 'inappropriate_content', label: 'Conteudo inadequado' },
    { value: 'wrong_category', label: 'Categoria incorreta' },
    { value: 'duplicate', label: 'Duplicado' },
    { value: 'spam', label: 'Spam' },
    { value: 'price_invalid', label: 'Preco invalido' },
    { value: 'missing_info', label: 'Informacoes faltando' },
    { value: 'prohibited_item', label: 'Item proibido' },
    { value: 'fake_listing', label: 'Anuncio falso' },
    { value: 'other', label: 'Outro motivo' },
];
const FIELDS = [
    { name: 'decision', label: 'Decisao', type: 'select', options: DECISION_OPTIONS },
    {
        name: 'rejectionReason',
        label: 'Motivo da rejeicao (se aplicavel)',
        type: 'select',
        options: REJECTION_REASON_OPTIONS,
        required: false,
    },
    {
        name: 'decisionNote',
        label: 'Observacao da revisao',
        type: 'textarea',
        placeholder: 'Detalhes da decisao — visivel so para a equipe (opcional)',
        required: false,
        maxLength: 1000,
    },
];
/**
 * Passo só de `mode === 'review'` (o engine decide `mode`; o gate de permissão fica na página).
 * Config-driven via `DynamicStepForm`. O `persist` do registry chama `moderateService(...)`.
 * "Motivo da rejeicao" sempre renderiza (o engine não tem campo condicional); só vai pro RPC
 * quando `decision === 'rejected'`.
 */
export function StepModeration({ state, patch }) {
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-foreground", children: "Revisao" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Registre a decisao desta revisao. Ela vira um novo registro de moderacao e ajusta o status do servico automaticamente." })] }), _jsx(DynamicStepForm, { fields: FIELDS, values: {
                    decision: state.decision,
                    rejectionReason: state.rejectionReason,
                    decisionNote: state.decisionNote,
                }, onChange: (name, value) => {
                    if (name === 'decision')
                        patch({ decision: String(value) });
                    if (name === 'rejectionReason')
                        patch({ rejectionReason: String(value) });
                    if (name === 'decisionNote')
                        patch({ decisionNote: String(value) });
                } })] }));
}
//# sourceMappingURL=step-moderation.js.map