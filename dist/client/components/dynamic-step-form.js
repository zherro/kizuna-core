'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useResourceOptions } from '../hooks/use-resource-options';
import { DynamicField } from './dynamic-field';
function isRelationField(field) {
    return field.type === 'relation';
}
/**
 * A wizard step as a dynamic, config-driven form — the step-level counterpart to
 * `ResourceScreen`'s `fields[]`, built on the same `ResourceScreenField` vocabulary and the same
 * `DynamicField` renderer. Same single-`relation`-field limit as `ResourceScreen`, same reason:
 * rules of hooks.
 *
 * Not every step fits this shape. A step whose UI is genuinely bespoke — file upload, a map
 * picker, a rich-text editor — stays its own component. This is only for steps that really are
 * just "a few fields" (see `services/steps/StepStatusForm.tsx` for the first real usage).
 */
export function DynamicStepForm({ fields, values, errors, onChange, }) {
    const relationField = fields.find(isRelationField) ?? null;
    const { options: relationRawOptions, getLabel } = useResourceOptions({
        resource: relationField?.optionsResource ?? '__none__',
        labelField: relationField?.optionsLabelField ?? 'name',
        filter: relationField?.optionsFilter,
    });
    return (_jsx("div", { className: "space-y-4", children: fields.map((field) => (_jsx(DynamicField, { field: field, value: values[field.name], error: errors?.[field.name], onChange: (value) => onChange(field.name, value), relationOptions: field.type === 'relation'
                ? relationRawOptions.map((item) => ({
                    value: String(item.id),
                    label: getLabel(item),
                }))
                : undefined }, field.name))) }));
}
//# sourceMappingURL=dynamic-step-form.js.map