import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from '../ui/input';
import { Label } from '../ui/label';
function toLabel(field) {
    return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}
/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="input"`) instead. */
export function WrapperField({ formik, field, label, className, placeholder, type = 'text', inputMode, transform, }) {
    const id = field;
    const rawValue = formik.values[field];
    const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    const touched = Boolean(formik.touched[field]);
    const errorValue = formik.errors[field];
    const error = touched && typeof errorValue === 'string' ? errorValue : '';
    return (_jsxs("div", { className: className ?? 'space-y-2', children: [_jsx(Label, { htmlFor: id, children: label ?? toLabel(field) }), _jsx(Input, { id: id, name: field, value: value, onChange: (event) => {
                    const nextValue = transform ? transform(event.target.value) : event.target.value;
                    void formik.setFieldValue(field, nextValue);
                }, onBlur: formik.handleBlur, placeholder: placeholder, type: type, inputMode: inputMode }), error ? _jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: error }) : null] }));
}
//# sourceMappingURL=wrapper-field.js.map