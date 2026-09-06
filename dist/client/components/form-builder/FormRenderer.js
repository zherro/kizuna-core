'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Star } from 'lucide-react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../ui/select';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { cn, resolveLucideIcon } from '../../../lib/utils';
import { useResourceOptions } from '../../hooks/use-resource-options';
import { DEFAULT_GRID, OPTION_TYPES, fieldKey, } from './types';
import { collectOutput, isFieldVisible, validate } from './validate';
const BP_ORDER = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const BP_MIN = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};
function useViewportWidth() {
    const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280);
    useEffect(() => {
        const onResize = () => setW(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return w;
}
function activeSpan(g, width) {
    let span = g.xs ?? DEFAULT_GRID.xs ?? 12;
    for (const bp of BP_ORDER) {
        if (width >= BP_MIN[bp] && g[bp] != null)
            span = g[bp];
    }
    return Math.max(1, Math.min(12, span));
}
/* ------------------------------------------------------------------ */
/* Option resolution                                                    */
/* ------------------------------------------------------------------ */
function ResourceOptionsField(props) {
    const src = props.field.optionsSource;
    const { options: rows } = useResourceOptions({
        resource: src.resource,
        labelField: src.labelField,
        filter: src.filter,
    });
    const resolved = useMemo(() => rows.map((row) => ({
        label: String(row[src.labelField] ?? row.id),
        value: String(row[src.valueField] ?? row.id),
    })), [rows, src.labelField, src.valueField]);
    return _jsx(BaseField, { ...props, options: resolved });
}
function StaticOptionsField(props) {
    return _jsx(BaseField, { ...props, options: props.field.options ?? [] });
}
function FieldSlot(props) {
    const usesResource = OPTION_TYPES.has(props.field.type) && Boolean(props.field.optionsSource?.resource);
    return usesResource ? _jsx(ResourceOptionsField, { ...props }) : _jsx(StaticOptionsField, { ...props });
}
function BaseField({ field, value, error, onChange, options, }) {
    const disabled = field.behavior.disabled;
    const readOnly = field.behavior.readOnly;
    const commonId = field.id;
    const Icon = resolveLucideIcon(field.appearance.icon);
    const labelRow = field.label ? (_jsxs(Label, { htmlFor: commonId, className: "flex items-center gap-1", children: [field.label, field.behavior.required && _jsx("span", { className: "text-destructive", children: "*" }), field.appearance.tooltip && (_jsx(Tooltip, { content: field.appearance.tooltip, children: _jsx(HelpCircle, { className: "h-3.5 w-3.5 text-muted-foreground" }) }))] })) : null;
    const withLabel = (children) => (_jsxs("div", { className: "space-y-1.5", children: [labelRow, field.description && (_jsx("p", { className: "text-xs text-muted-foreground", children: field.description })), children, field.appearance.helpText && (_jsx("p", { className: "text-xs text-muted-foreground", children: field.appearance.helpText })), error && _jsx("p", { className: "text-xs font-medium text-destructive", children: error })] }));
    const adornInput = (input) => Icon ? (_jsxs("div", { className: "relative", children: [_jsx(Icon, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), input] })) : (input);
    switch (field.type) {
        case 'text':
        case 'email':
        case 'url':
        case 'password':
        case 'phone':
            return withLabel(adornInput(_jsx(Input, { id: commonId, type: field.type === 'password'
                    ? 'password'
                    : field.type === 'email'
                        ? 'email'
                        : field.type === 'url'
                            ? 'url'
                            : field.type === 'phone'
                                ? 'tel'
                                : 'text', className: Icon ? 'pl-9' : undefined, placeholder: field.placeholder, value: value ?? '', onChange: (e) => onChange(e.target.value), disabled: disabled, readOnly: readOnly })));
        case 'textarea':
            return withLabel(_jsx(Textarea, { id: commonId, placeholder: field.placeholder, value: value ?? '', onChange: (e) => onChange(e.target.value), disabled: disabled, readOnly: readOnly }));
        case 'number':
        case 'decimal':
        case 'currency':
            return withLabel(adornInput(_jsx(Input, { id: commonId, type: "number", className: Icon ? 'pl-9' : undefined, step: field.type === 'number' ? 1 : 0.01, placeholder: field.placeholder, value: value ?? '', onChange: (e) => onChange(e.target.value === '' ? '' : Number(e.target.value)), disabled: disabled, readOnly: readOnly })));
        case 'date':
        case 'time':
        case 'datetime':
            return withLabel(_jsx(Input, { id: commonId, type: field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'datetime-local', value: value ?? '', onChange: (e) => onChange(e.target.value), disabled: disabled, readOnly: readOnly }));
        case 'select':
            return withLabel(_jsxs(Select, { value: value ?? '', onValueChange: (v) => onChange(v), children: [_jsx(SelectTrigger, { id: commonId, className: "h-10 w-full text-sm", children: _jsx(SelectValue, { children: options.find((o) => o.value === value)?.label ??
                                field.placeholder ??
                                'Selecione...' }) }), _jsx(SelectContent, { children: options.map((o) => (_jsx(SelectItem, { value: o.value, children: o.label }, o.value))) })] }));
        case 'multiselect': {
            const arr = value ?? [];
            return withLabel(_jsx("div", { className: "flex flex-wrap gap-2", children: options.map((o) => {
                    const active = arr.includes(o.value);
                    return (_jsx("button", { type: "button", disabled: disabled, onClick: () => onChange(active ? arr.filter((x) => x !== o.value) : [...arr, o.value]), className: cn('rounded-full border px-3 py-1 text-xs transition-colors', active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background hover:bg-muted'), children: o.label }, o.value));
                }) }));
        }
        case 'radio':
            return withLabel(_jsx(RadioGroup, { value: value ?? '', onValueChange: (v) => onChange(v), disabled: disabled, children: options.map((o) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(RadioGroupItem, { value: o.value, id: `${commonId}-${o.value}` }), _jsx(Label, { htmlFor: `${commonId}-${o.value}`, className: "font-normal", children: o.label })] }, o.value))) }));
        case 'checkbox':
            return (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Checkbox, { id: commonId, checked: !!value, onCheckedChange: (c) => onChange(!!c), disabled: disabled }), _jsxs("div", { className: "space-y-0.5", children: [_jsxs(Label, { htmlFor: commonId, className: "font-normal", children: [field.label, field.behavior.required && (_jsx("span", { className: "ml-1 text-destructive", children: "*" }))] }), field.description && (_jsx("p", { className: "text-xs text-muted-foreground", children: field.description }))] })] }), error && _jsx("p", { className: "text-xs font-medium text-destructive", children: error })] }));
        case 'switch':
            return (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between rounded-md border p-3", children: [_jsxs("div", { className: "space-y-0.5", children: [_jsx(Label, { htmlFor: commonId, children: field.label }), field.description && (_jsx("p", { className: "text-xs text-muted-foreground", children: field.description }))] }), _jsx(Switch, { id: commonId, checked: !!value, onCheckedChange: (c) => onChange(c), disabled: disabled })] }), error && _jsx("p", { className: "text-xs font-medium text-destructive", children: error })] }));
        case 'slider': {
            const v = typeof value === 'number' ? value : (field.min ?? 0);
            return withLabel(_jsxs("div", { className: "space-y-2", children: [_jsx("input", { type: "range", className: "w-full accent-primary", value: v, min: field.min ?? 0, max: field.max ?? 100, step: field.step ?? 1, onChange: (e) => onChange(Number(e.target.value)), disabled: disabled }), _jsx("div", { className: "text-right text-xs text-muted-foreground", children: v })] }));
        }
        case 'rating': {
            const v = typeof value === 'number' ? value : 0;
            const max = field.max ?? 5;
            return withLabel(_jsx("div", { className: "flex items-center gap-1", children: Array.from({ length: max }).map((_, i) => {
                    const n = i + 1;
                    return (_jsx("button", { type: "button", onClick: () => !disabled && onChange(n), className: "p-0.5", "aria-label": `${n}`, children: _jsx(Star, { className: cn('h-6 w-6 transition-colors', n <= v ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground') }) }, n));
                }) }));
        }
        case 'color':
            return withLabel(_jsx(Input, { id: commonId, type: "color", value: value ?? '#000000', onChange: (e) => onChange(e.target.value), disabled: disabled, className: "h-10 w-20 p-1" }));
        case 'upload':
        case 'image':
            return withLabel(_jsx(Input, { id: commonId, type: "file", accept: field.type === 'image' ? 'image/*' : undefined, multiple: field.type === 'image', onChange: (e) => {
                    const files = e.target.files
                        ? Array.from(e.target.files).map((f) => f.name)
                        : [];
                    onChange(field.type === 'image' ? files : (files[0] ?? ''));
                }, disabled: disabled }));
        case 'hidden':
            return null;
        case 'divider':
            return _jsx(Separator, {});
        case 'heading':
            return _jsx("h3", { className: "text-lg font-semibold", children: field.label });
        case 'info':
            return (_jsxs("div", { className: "rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground", children: [field.label, field.description && _jsx("p", { className: "mt-1 text-xs", children: field.description })] }));
        default:
            return null;
    }
}
/* ------------------------------------------------------------------ */
/* FormRenderer                                                         */
/* ------------------------------------------------------------------ */
export function FormRenderer({ schema, values, onChange, onSubmit, className, widthOverride, }) {
    const [errors, setErrors] = useState({});
    const vw = useViewportWidth();
    const width = widthOverride ?? vw;
    const visibleFields = useMemo(() => schema.fields.filter((f) => isFieldVisible(f, values)), [schema.fields, values]);
    return (_jsxs("form", { className: cn('space-y-4', className), onSubmit: (e) => {
            e.preventDefault();
            if (!onSubmit)
                return;
            const found = validate(schema, values);
            setErrors(found);
            if (Object.keys(found).length === 0)
                onSubmit(collectOutput(schema, values));
        }, children: [(schema.title || schema.description) && (_jsxs("div", { className: "space-y-1", children: [schema.title && _jsx("h2", { className: "text-xl font-bold", children: schema.title }), schema.description && (_jsx("p", { className: "text-sm text-muted-foreground", children: schema.description }))] })), _jsx("div", { className: "grid grid-cols-12 gap-4", children: visibleFields.map((f) => {
                    const fullWidth = f.type === 'divider' || f.type === 'heading' || f.type === 'info';
                    const span = fullWidth ? 12 : activeSpan(f.grid, width);
                    const key = fieldKey(f);
                    return (_jsx("div", { style: { gridColumn: `span ${span} / span ${span}`, order: f.grid.order }, children: _jsx(FieldSlot, { field: f, value: values[key], error: errors[key], onChange: (v) => onChange({ ...values, [key]: v }) }) }, f.id));
                }) }), onSubmit && (_jsx("div", { className: "flex justify-end pt-2", children: _jsx(Button, { type: "submit", children: "Enviar" }) }))] }));
}
//# sourceMappingURL=FormRenderer.js.map