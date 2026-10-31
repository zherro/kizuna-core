import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Label } from '../ui/label';
function toLabel(field) {
    return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}
export function WrapperSelect({ formik, field, label, className, options, placeholder, onValueChange, }) {
    const id = field;
    const rawValue = formik.values[field];
    const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    const touched = Boolean(formik.touched[field]);
    const errorValue = formik.errors[field];
    const error = touched && typeof errorValue === 'string' ? errorValue : '';
    return (_jsxs("div", { className: className ?? 'space-y-2', children: [_jsx(Label, { htmlFor: id, children: label ?? toLabel(field) }), _jsxs("select", { id: id, name: field, className: "h-10 w-full rounded-md border border-input bg-background px-3 text-sm", value: value, onChange: (event) => {
                    if (onValueChange) {
                        onValueChange(event.target.value, formik);
                        return;
                    }
                    void formik.setFieldValue(field, event.target.value);
                }, onBlur: formik.handleBlur, children: [placeholder ? _jsx("option", { value: "", children: placeholder }) : null, options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value)))] }), error ? _jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: error }) : null] }));
}
//# sourceMappingURL=wrapper-select.js.map