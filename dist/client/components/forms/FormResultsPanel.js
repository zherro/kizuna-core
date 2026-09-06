'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FormResultViewer } from '../form-builder';
import { useFormAnswers } from './use-form-answers';
/**
 * Read-only render of the current `form_results` row for a `(formKey, domain, referenceId)`
 * triple, drawn against its frozen `schema_snapshot` so old captures stay renderable after the
 * form is edited. Use it in an admin/detail surface next to the entity the answers describe.
 */
export function FormResultsPanel({ formKey, domain, referenceId, title = 'Respostas do formulario', className, }) {
    const { data, loading, error } = useFormAnswers({ formKey, domain, referenceId });
    return (_jsxs("section", { className: className, children: [_jsx("h3", { className: "mb-2 text-sm font-medium text-foreground", children: title }), loading ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Carregando..." })) : error ? (_jsx("p", { className: "text-xs text-red-400", children: error })) : !data ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhuma resposta registrada para este item." })) : (_jsx(FormResultViewer, { schema: (data.schemaSnapshot ?? {}), values: data.answers ?? {} }))] }));
}
//# sourceMappingURL=FormResultsPanel.js.map