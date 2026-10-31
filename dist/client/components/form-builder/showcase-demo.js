'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { FormBuilder } from './FormBuilder';
import { FormRenderer } from './FormRenderer';
import { FormResultViewer } from './FormResultViewer';
const DEMO_SCHEMA = {
    title: 'Orçamento de serviço',
    description: 'Round-trip: builder → renderer → result viewer.',
    fields: [
        {
            id: 'f_nome',
            key: 'nome',
            name: 'nome',
            type: 'text',
            label: 'Seu nome',
            placeholder: 'João Silva',
            grid: { xs: 12, md: 6 },
            behavior: { required: true },
            validation: { minLength: 3 },
            appearance: { icon: 'User', tooltip: 'Como devemos te chamar' },
        },
        {
            id: 'f_categoria',
            key: 'categoria',
            name: 'categoria',
            type: 'select',
            label: 'Categoria',
            grid: { xs: 12, md: 6 },
            behavior: { required: true },
            validation: {},
            appearance: {},
            options: [
                { label: 'Elétrica', value: 'eletrica' },
                { label: 'Hidráulica', value: 'hidraulica' },
                { label: 'Outro', value: 'outro' },
            ],
        },
        {
            id: 'f_outro',
            key: 'qual_outro',
            name: 'qual_outro',
            type: 'text',
            label: 'Qual serviço?',
            grid: { xs: 12 },
            behavior: {},
            validation: {},
            appearance: {},
            visibleWhen: { field: 'categoria', op: 'eq', value: 'outro' },
        },
        {
            id: 'f_urgencia',
            key: 'urgencia',
            name: 'urgencia',
            type: 'slider',
            label: 'Urgência',
            grid: { xs: 12 },
            behavior: {},
            validation: {},
            appearance: { helpText: '0 = sem pressa, 10 = emergência' },
            min: 0,
            max: 10,
            step: 1,
        },
        {
            id: 'f_emergencia',
            key: 'atende_emergencia',
            name: 'atende_emergencia',
            type: 'switch',
            label: 'Preciso de atendimento hoje',
            grid: { xs: 12 },
            behavior: {},
            validation: {},
            appearance: {},
        },
    ],
};
export function FormBuilderShowcaseDemo() {
    const [schema, setSchema] = useState(DEMO_SCHEMA);
    const [values, setValues] = useState({});
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "overflow-hidden rounded-lg border", children: _jsx(FormBuilder, { value: schema, onChange: setSchema }) }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "rounded-lg border p-4", children: [_jsx("p", { className: "mb-3 text-xs font-semibold uppercase text-muted-foreground", children: "FormRenderer (standalone)" }), _jsx(FormRenderer, { schema: schema, values: values, onChange: setValues, onSubmit: (out) => window.alert(JSON.stringify(out, null, 2)) })] }), _jsx("div", { className: "rounded-lg border p-4", children: _jsx(FormResultViewer, { schema: schema, values: values }) })] })] }));
}
//# sourceMappingURL=showcase-demo.js.map