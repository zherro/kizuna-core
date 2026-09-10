import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
function toLabel(field) {
    return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}
/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="textarea"`) instead. */
export function WrapperTextarea({ formik, field, label, className, placeholder, rows = 4, }) {
    const id = field;
    const rawValue = formik.values[field];
    const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    const touched = Boolean(formik.touched[field]);
    const errorValue = formik.errors[field];
    const error = touched && typeof errorValue === 'string' ? errorValue : '';
    return (_jsxs("div", { className: className ?? 'space-y-2', children: [_jsx(Label, { htmlFor: id, children: label ?? toLabel(field) }), _jsx(Textarea, { id: id, name: field, value: value, rows: rows, placeholder: placeholder, onChange: (event) => {
                    void formik.setFieldValue(field, event.target.value);
                }, onBlur: formik.handleBlur }), error ? _jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: error }) : null] }));
}
//# sourceMappingURL=wrapper-textarea.js.map