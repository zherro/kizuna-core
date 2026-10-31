'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { SearchableSelect } from './ui/searchable-select';
/**
 * Renders exactly one field from a `ResourceScreenField` config. Framework-agnostic on purpose:
 * takes a plain `value`/`onChange`, not a Formik binding, so `ResourceScreen` drives it without
 * either depending on the other's state management.
 */
export function DynamicField({ field, value, error, onChange, onBlur, relationOptions, }) {
    if (field.type === 'switch') {
        return (_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-border p-3", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: field.name, children: field.label }), error ? _jsx("p", { className: "mt-1 text-xs text-red-400", children: error }) : null] }), _jsx(Switch, { id: field.name, checked: Boolean(value), onCheckedChange: onChange })] }));
    }
    if (field.type === 'textarea') {
        return (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: field.name, children: field.label }), _jsx(Textarea, { id: field.name, name: field.name, value: String(value ?? ''), rows: field.rows ?? 4, placeholder: field.placeholder, onChange: (event) => onChange(event.target.value), onBlur: onBlur }), error ? _jsx("p", { className: "text-xs text-red-400", children: error }) : null] }));
    }
    if (field.type === 'relation' || field.type === 'select') {
        const options = field.type === 'select' ? field.options : (relationOptions ?? []);
        return (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: field.name, children: field.label }), _jsx(SearchableSelect, { id: field.name, value: String(value ?? ''), onChange: onChange, onBlur: onBlur, options: options, placeholder: field.placeholder ?? 'Selecione...', disabled: options.length === 0 }), error ? _jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: error }) : null] }));
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: field.name, children: field.label }), _jsx(Input, { id: field.name, name: field.name, value: String(value ?? ''), placeholder: field.placeholder, onChange: (event) => onChange(event.target.value), onBlur: onBlur }), error ? _jsx("p", { className: "text-xs text-red-400", children: error }) : null] }));
}
//# sourceMappingURL=dynamic-field.js.map