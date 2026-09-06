'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { FormBuilder, FormRenderer, FormResultViewer, createField, validate, } from '../form-builder';
function seedSchema() {
    const watts = createField('number');
    watts.key = 'potencia_watts';
    watts.name = 'potencia_watts';
    watts.label = 'Potencia total (W)';
    watts.behavior = { ...watts.behavior, required: true };
    watts.validation = { ...watts.validation, min: 100 };
    const emergencia = createField('switch');
    emergencia.key = 'atende_emergencia';
    emergencia.name = 'atende_emergencia';
    emergencia.label = 'Atende chamados de emergencia';
    return {
        title: 'Detalhes do servico de som',
        description: 'Perguntas dinamicas por categoria (exemplo).',
        fields: [watts, emergencia],
    };
}
/**
 * Backend-free showcase for the `forms` plugin's consumer-facing pieces: a `FormBuilder` whose
 * schema feeds a live `FormRenderer` (with `validate()` gating a fake "continuar") and a
 * `FormResultViewer` rendering the captured answers. `FormsAdmin` / `DynamicFormStep` need the
 * resource route + RPC, so they are demoed against this same in-memory schema, not the network.
 */
export function FormsShowcaseDemo() {
    const [schema, setSchema] = useState(seedSchema);
    const [values, setValues] = useState({});
    const [captured, setCaptured] = useState(null);
    const errors = useMemo(() => validate(schema, values), [schema, values]);
    const valid = Object.keys(errors).length === 0;
    return (_jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-sm font-medium", children: "1. Autoria (FormBuilder)" }), _jsx(FormBuilder, { value: schema, onChange: setSchema })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-sm font-medium", children: "2. Preenchimento (FormRenderer + validate)" }), _jsx(FormRenderer, { schema: schema, values: values, onChange: setValues }), _jsx("button", { type: "button", disabled: !valid, onClick: () => setCaptured(values), className: "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50", children: "Continuar" }), !valid ? (_jsx("p", { className: "text-xs text-red-400", children: Object.values(errors)[0] })) : null] }), captured ? (_jsxs("div", { className: "space-y-2 border-t border-border pt-4", children: [_jsx("h4", { className: "text-sm font-medium", children: "3. Resultado (FormResultViewer)" }), _jsx(FormResultViewer, { schema: schema, values: captured })] })) : null] })] }));
}
//# sourceMappingURL=showcase-demo.js.map