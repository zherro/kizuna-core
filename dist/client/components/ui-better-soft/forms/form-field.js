'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
function toLabel(field) {
    return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}
/**
 * Normalized replacement for `wrapper-field.tsx` / `wrapper-checkbox.tsx` /
 * `wrapper-textarea.tsx` (see `src/components/wrraper/`, now deprecated) —
 * one Formik-bound field component covering input, textarea and switch,
 * styled with this app's fixed visual language instead of raw wrapper markup.
 */
export function FormField(props) {
    const { formik, field, label, description, className } = props;
    const id = field;
    const touched = Boolean(formik.touched[field]);
    const errorValue = formik.errors[field];
    const error = touched && typeof errorValue === 'string' ? errorValue : '';
    const resolvedLabel = label ?? toLabel(field);
    if (props.as === 'switch') {
        const checked = Boolean(formik.values[field]);
        return (_jsxs("div", { className: className ?? 'flex items-center justify-between rounded-xl border border-border p-3', children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: id, children: resolvedLabel }), description ? (_jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: description })) : null, error ? _jsx("p", { className: "mt-1 text-xs text-red-400", children: error }) : null] }), _jsx(Switch, { id: id, checked: checked, onCheckedChange: (value) => void formik.setFieldValue(field, value) })] }));
    }
    const rawValue = formik.values[field];
    const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    if (props.as === 'textarea') {
        return (_jsxs("div", { className: className ?? 'space-y-2', children: [_jsx(Label, { htmlFor: id, children: resolvedLabel }), description ? _jsx("p", { className: "text-xs text-muted-foreground", children: description }) : null, _jsx(Textarea, { id: id, name: field, value: value, rows: props.rows ?? 4, placeholder: props.placeholder, onChange: (event) => void formik.setFieldValue(field, event.target.value), onBlur: formik.handleBlur }), error ? (_jsx("p", { className: "text-xs text-red-400\n        ", children: error })) : null] }));
    }
    return (_jsxs("div", { className: className ?? 'space-y-2', children: [_jsx(Label, { htmlFor: id, children: resolvedLabel }), description ? _jsx("p", { className: "text-xs text-muted-foreground", children: description }) : null, _jsx(Input, { id: id, name: field, value: value, type: props.type ?? 'text', inputMode: props.inputMode, placeholder: props.placeholder, onChange: (event) => {
                    const nextValue = props.transform
                        ? props.transform(event.target.value)
                        : event.target.value;
                    void formik.setFieldValue(field, nextValue);
                }, onBlur: formik.handleBlur }), error ? (_jsx("p", { className: "text-xs text-red-400\n      ", children: error })) : null] }));
}
//# sourceMappingURL=form-field.js.map