import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="switch"`) instead. */
export function WrapperCheckbox({ formik, field, label, className, }) {
    const id = field;
    const checked = Boolean(formik.values[field]);
    const touched = Boolean(formik.touched[field]);
    const errorValue = formik.errors[field];
    const error = touched && typeof errorValue === 'string' ? errorValue : '';
    return (_jsxs("div", { className: className ?? 'space-y-1', children: [_jsxs("label", { htmlFor: id, className: "inline-flex items-center gap-2 text-sm", children: [_jsx("input", { id: id, name: field, type: "checkbox", className: "h-4 w-4", checked: checked, onChange: (event) => void formik.setFieldValue(field, event.target.checked), onBlur: formik.handleBlur }), label] }), error ? _jsx("p", { className: "text-xs text-red-600 dark:text-red-300", children: error }) : null] }));
}
//# sourceMappingURL=wrapper-checkbox.js.map