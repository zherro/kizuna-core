'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Copy, Trash2, GripVertical, Plus, Lock, Unlock } from 'lucide-react';
import { KEY_REGEX, OPTION_TYPES, slugifyKey, uid, } from './types';
const BPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const VISIBLE_OPS = ['eq', 'ne', 'in', 'gt', 'lt', 'truthy'];
export function FieldEditor({ field, onChange, onDelete, onDuplicate, mode = 'advanced', priorFields = [], keyError, }) {
    const [keyLocked, setKeyLocked] = React.useState(true);
    const trackingKey = !field.key;
    const patch = (p) => onChange({ ...field, ...p });
    const patchBeh = (p) => onChange({ ...field, behavior: { ...field.behavior, ...p } });
    const patchVal = (p) => onChange({ ...field, validation: { ...field.validation, ...p } });
    const patchApp = (p) => onChange({ ...field, appearance: { ...field.appearance, ...p } });
    const setLabel = (label) => {
        if (trackingKey) {
            const k = slugifyKey(label);
            patch({ label, key: k, name: k });
        }
        else {
            patch({ label });
        }
    };
    const setKey = (raw) => {
        const k = raw.trim();
        patch({ key: k, name: k });
    };
    const keyInvalid = field.key !== '' && !KEY_REGEX.test(field.key);
    const hasOptions = OPTION_TYPES.has(field.type);
    const usesResource = Boolean(field.optionsSource);
    const setSource = (p) => patch({
        optionsSource: {
            resource: '',
            labelField: 'name',
            valueField: 'id',
            ...field.optionsSource,
            ...p,
        },
    });
    const setVisible = (p) => patch({
        visibleWhen: {
            field: priorFields[0]?.key ?? '',
            op: 'truthy',
            ...field.visibleWhen,
            ...p,
        },
    });
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-semibold", children: field.label || 'Sem título' }), _jsx("p", { className: "text-xs text-muted-foreground", children: field.type })] }), _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { size: "icon", variant: "ghost", onClick: onDuplicate, title: "Duplicar", children: _jsx(Copy, { className: "h-4 w-4" }) }), _jsx(Button, { size: "icon", variant: "ghost", onClick: onDelete, title: "Excluir", children: _jsx(Trash2, { className: "h-4 w-4 text-destructive" }) })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Chave (key)" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Input, { value: field.key, disabled: keyLocked && !trackingKey, placeholder: "ex: atende_emergencia", onChange: (e) => setKey(e.target.value) }), !trackingKey && (_jsx(Button, { size: "icon", variant: "ghost", title: keyLocked ? 'Editar chave' : 'Bloquear chave', onClick: () => setKeyLocked((v) => !v), children: keyLocked ? _jsx(Lock, { className: "h-4 w-4" }) : _jsx(Unlock, { className: "h-4 w-4" }) }))] }), trackingKey && (_jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Gerada a partir do label at\u00E9 voc\u00EA defini-la." })), keyInvalid && (_jsx("p", { className: "mt-1 text-xs text-destructive", children: "Use apenas letras min\u00FAsculas, n\u00FAmeros e _ (come\u00E7ando por letra)." })), keyError && _jsx("p", { className: "mt-1 text-xs text-destructive", children: keyError })] }), mode === 'simple' ? (_jsx(SimpleEditor, { field: field, patch: patch, patchBeh: patchBeh, setLabel: setLabel })) : (_jsxs(Accordion, { type: "multiple", defaultValue: ['info', 'behavior'], children: [_jsxs(AccordionItem, { value: "info", children: [_jsx(AccordionTrigger, { children: "Informa\u00E7\u00F5es" }), _jsxs(AccordionContent, { className: "space-y-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Label" }), _jsx(Input, { value: field.label, onChange: (e) => setLabel(e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Placeholder" }), _jsx(Input, { value: field.placeholder ?? '', onChange: (e) => patch({ placeholder: e.target.value }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Descri\u00E7\u00E3o" }), _jsx(Textarea, { rows: 2, value: field.description ?? '', onChange: (e) => patch({ description: e.target.value }) })] })] })] }), _jsxs(AccordionItem, { value: "behavior", children: [_jsx(AccordionTrigger, { children: "Comportamento" }), _jsxs(AccordionContent, { className: "space-y-2", children: [[
                                        ['required', 'Obrigatório'],
                                        ['readOnly', 'Somente leitura'],
                                        ['disabled', 'Desabilitado'],
                                        ['hidden', 'Invisível'],
                                    ].map(([key, label]) => (_jsxs("label", { className: "flex items-center justify-between text-sm", children: [label, _jsx(Switch, { checked: !!field.behavior[key], onCheckedChange: (c) => patchBeh({ [key]: c }) })] }, key))), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Valor padr\u00E3o" }), _jsx(Input, { value: field.behavior.defaultValue ?? '', onChange: (e) => patchBeh({ defaultValue: e.target.value }) })] })] })] }), _jsxs(AccordionItem, { value: "visibility", children: [_jsx(AccordionTrigger, { children: "Visibilidade condicional" }), _jsx(AccordionContent, { className: "space-y-2", children: priorFields.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Adicione campos antes deste para criar uma condi\u00E7\u00E3o." })) : !field.visibleWhen ? (_jsxs(Button, { size: "sm", variant: "outline", onClick: () => setVisible({ field: priorFields[0].key, op: 'truthy' }), children: [_jsx(Plus, { className: "mr-1 h-3.5 w-3.5" }), " Mostrar s\u00F3 quando..."] })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Campo" }), _jsx("select", { className: "h-9 w-full rounded-md border bg-background px-2 text-sm", value: field.visibleWhen.field, onChange: (e) => setVisible({ field: e.target.value }), children: priorFields.map((pf) => (_jsx("option", { value: pf.key, children: pf.label || pf.key }, pf.id))) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Operador" }), _jsx("select", { className: "h-9 w-full rounded-md border bg-background px-2 text-sm", value: field.visibleWhen.op, onChange: (e) => setVisible({ op: e.target.value }), children: VISIBLE_OPS.map((op) => (_jsx("option", { value: op, children: op }, op))) })] }), field.visibleWhen.op !== 'truthy' && (_jsxs("div", { children: [_jsxs(Label, { className: "text-xs", children: ["Valor", field.visibleWhen.op === 'in' ? ' (separado por vírgula)' : ''] }), _jsx(Input, { value: Array.isArray(field.visibleWhen.value)
                                                        ? field.visibleWhen.value.join(',')
                                                        : String(field.visibleWhen.value ?? ''), onChange: (e) => setVisible({
                                                        value: field.visibleWhen?.op === 'in'
                                                            ? e.target.value.split(',').map((s) => s.trim())
                                                            : e.target.value,
                                                    }) })] })), _jsxs(Button, { size: "sm", variant: "ghost", className: "text-destructive", onClick: () => patch({ visibleWhen: undefined }), children: [_jsx(Trash2, { className: "mr-1 h-3.5 w-3.5" }), " Remover condi\u00E7\u00E3o"] })] })) })] }), _jsxs(AccordionItem, { value: "validation", children: [_jsx(AccordionTrigger, { children: "Valida\u00E7\u00E3o" }), _jsxs(AccordionContent, { className: "space-y-2", children: [_jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                                            ['min', 'Mínimo'],
                                            ['max', 'Máximo'],
                                            ['minLength', 'Tam. mín.'],
                                            ['maxLength', 'Tam. máx.'],
                                        ].map(([key, label]) => (_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: label }), _jsx(Input, { type: "number", value: field.validation[key] ?? '', onChange: (e) => patchVal({
                                                        [key]: e.target.value === '' ? undefined : Number(e.target.value),
                                                    }) })] }, key))) }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Regex" }), _jsx(Input, { value: field.validation.regex ?? '', onChange: (e) => patchVal({ regex: e.target.value }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Mensagem de erro" }), _jsx(Input, { value: field.validation.message ?? '', onChange: (e) => patchVal({ message: e.target.value }) })] })] })] }), _jsxs(AccordionItem, { value: "appearance", children: [_jsx(AccordionTrigger, { children: "Apar\u00EAncia" }), _jsxs(AccordionContent, { className: "space-y-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "\u00CDcone (nome lucide)" }), _jsx(Input, { value: field.appearance.icon ?? '', onChange: (e) => patchApp({ icon: e.target.value }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Texto de ajuda" }), _jsx(Input, { value: field.appearance.helpText ?? '', onChange: (e) => patchApp({ helpText: e.target.value }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Tooltip" }), _jsx(Input, { value: field.appearance.tooltip ?? '', onChange: (e) => patchApp({ tooltip: e.target.value }) })] })] })] }), hasOptions && (_jsxs(AccordionItem, { value: "options", children: [_jsx(AccordionTrigger, { children: "Op\u00E7\u00F5es" }), _jsxs(AccordionContent, { className: "space-y-2", children: [_jsxs("label", { className: "flex items-center justify-between text-sm", children: ["Op\u00E7\u00F5es de um recurso", _jsx(Switch, { checked: usesResource, onCheckedChange: (c) => patch({
                                                    optionsSource: c
                                                        ? { resource: '', labelField: 'name', valueField: 'id' }
                                                        : undefined,
                                                }) })] }), usesResource ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Recurso" }), _jsx(Input, { value: field.optionsSource?.resource ?? '', onChange: (e) => setSource({ resource: e.target.value }) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Campo label" }), _jsx(Input, { value: field.optionsSource?.labelField ?? '', onChange: (e) => setSource({ labelField: e.target.value }) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Campo valor" }), _jsx(Input, { value: field.optionsSource?.valueField ?? '', onChange: (e) => setSource({ valueField: e.target.value }) })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Filtro (campo=valor, por linha)" }), _jsx(Textarea, { rows: 2, value: Object.entries(field.optionsSource?.filter ?? {})
                                                            .map(([k, v]) => `${k}=${v}`)
                                                            .join('\n'), onChange: (e) => {
                                                            const filter = {};
                                                            for (const line of e.target.value.split('\n')) {
                                                                const [k, ...rest] = line.split('=');
                                                                if (k.trim())
                                                                    filter[k.trim()] = rest.join('=').trim();
                                                            }
                                                            setSource({
                                                                filter: Object.keys(filter).length ? filter : undefined,
                                                            });
                                                        } })] })] })) : (_jsx(OptionListEditor, { field: field, patch: patch }))] })] })), _jsxs(AccordionItem, { value: "layout", children: [_jsx(AccordionTrigger, { children: "Layout (Grid)" }), _jsxs(AccordionContent, { className: "space-y-2", children: [_jsx("div", { className: "grid grid-cols-3 gap-2", children: BPS.map((bp) => (_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: bp }), _jsx(Input, { type: "number", min: 1, max: 12, value: field.grid[bp] ?? '', onChange: (e) => patch({
                                                        grid: {
                                                            ...field.grid,
                                                            [bp]: e.target.value === '' ? undefined : Number(e.target.value),
                                                        },
                                                    }) })] }, bp))) }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Ordem" }), _jsx(Input, { type: "number", value: field.grid.order ?? '', onChange: (e) => patch({
                                                    grid: {
                                                        ...field.grid,
                                                        order: e.target.value === '' ? undefined : Number(e.target.value),
                                                    },
                                                }) })] })] })] })] }))] }));
}
function OptionListEditor({ field, patch, }) {
    const options = field.options ?? [];
    return (_jsxs("div", { className: "space-y-2", children: [options.map((o, idx) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(GripVertical, { className: "h-4 w-4 text-muted-foreground" }), _jsx(Input, { className: "h-8", placeholder: "Label", value: o.label, onChange: (e) => {
                            const next = [...options];
                            next[idx] = { ...next[idx], label: e.target.value };
                            patch({ options: next });
                        } }), _jsx(Input, { className: "h-8", placeholder: "valor", value: o.value, onChange: (e) => {
                            const next = [...options];
                            next[idx] = { ...next[idx], value: e.target.value };
                            patch({ options: next });
                        } }), _jsx(Button, { size: "icon", variant: "ghost", onClick: () => patch({ options: options.filter((_, i) => i !== idx) }), children: _jsx(Trash2, { className: "h-3.5 w-3.5 text-destructive" }) })] }, idx))), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => {
                    const next = [
                        ...options,
                        { label: `Opção ${options.length + 1}`, value: uid('opt') },
                    ];
                    patch({ options: next });
                }, children: [_jsx(Plus, { className: "mr-1 h-3.5 w-3.5" }), " Adicionar op\u00E7\u00E3o"] })] }));
}
const spanFromWidth = (w) => (w === 'full' ? 12 : w === 'half' ? 6 : 4);
const widthFromSpan = (span, fallback) => {
    if (span == null)
        return fallback;
    if (span >= 12)
        return 'full';
    if (span <= 4)
        return 'third';
    return 'half';
};
function SimpleEditor({ field, patch, patchBeh, setLabel }) {
    const hasOptions = OPTION_TYPES.has(field.type);
    const mobileWidth = widthFromSpan(field.grid.xs, 'full');
    const tabletWidth = widthFromSpan(field.grid.md, 'half');
    const desktopWidth = widthFromSpan(field.grid.lg, 'half');
    const setDeviceWidth = (device, w) => {
        const span = spanFromWidth(w);
        const next = { ...field.grid };
        if (device === 'mobile') {
            next.xs = span;
            next.sm = span;
        }
        else if (device === 'tablet') {
            next.md = span;
        }
        else {
            next.lg = span;
            next.xl = span;
            next['2xl'] = span;
        }
        patch({ grid: next });
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Pergunta" }), _jsx(Input, { value: field.label, onChange: (e) => setLabel(e.target.value), placeholder: "Ex: Qual seu nome?" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Texto de exemplo (opcional)" }), _jsx(Input, { value: field.placeholder ?? '', onChange: (e) => patch({ placeholder: e.target.value }), placeholder: "Ex: Jo\u00E3o Silva" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-xs", children: "Dica de ajuda (opcional)" }), _jsx(Textarea, { rows: 2, value: field.description ?? '', onChange: (e) => patch({ description: e.target.value }), placeholder: "Uma explica\u00E7\u00E3o curta para o usu\u00E1rio" })] }), _jsxs("label", { className: "flex items-center justify-between rounded-md border p-2 text-sm", children: [_jsx("span", { children: "Este campo \u00E9 obrigat\u00F3rio?" }), _jsx(Switch, { checked: !!field.behavior.required, onCheckedChange: (c) => patchBeh({ required: c }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs", children: "Tamanho do campo por dispositivo" }), [
                        ['mobile', 'Celular', mobileWidth],
                        ['tablet', 'Tablet', tabletWidth],
                        ['desktop', 'Computador', desktopWidth],
                    ].map(([device, deviceLabel, current]) => (_jsxs("div", { className: "rounded-md border p-2", children: [_jsx("p", { className: "mb-1 text-xs text-muted-foreground", children: deviceLabel }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: [
                                    ['full', 'Inteiro'],
                                    ['half', 'Metade'],
                                    ['third', 'Um terço'],
                                ].map(([w, label]) => (_jsx(Button, { type: "button", size: "sm", variant: current === w ? 'default' : 'outline', onClick: () => setDeviceWidth(device, w), children: label }, w))) })] }, device)))] }), hasOptions && _jsx(OptionListEditor, { field: field, patch: patch })] }));
}
//# sourceMappingURL=FieldEditor.js.map