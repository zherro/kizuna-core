'use client';

import { useResourceOptions } from '../hooks/use-resource-options';
import { DynamicField } from './dynamic-field';
import type { ResourceScreenField, ResourceScreenRelationField } from '../../types/resource-screen';

type DynamicStepFormProps = {
  fields: ResourceScreenField[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
};

function isRelationField(field: ResourceScreenField): field is ResourceScreenRelationField {
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
export function DynamicStepForm({
  fields,
  values,
  errors,
  onChange,
}: Readonly<DynamicStepFormProps>) {
  const relationField = fields.find(isRelationField) ?? null;

  const { options: relationRawOptions, getLabel } = useResourceOptions<
    Record<string, unknown> & { id: string | number }
  >({
    resource: relationField?.optionsResource ?? '__none__',
    labelField: relationField?.optionsLabelField ?? 'name',
    filter: relationField?.optionsFilter,
  });

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <DynamicField
          key={field.name}
          field={field}
          value={values[field.name]}
          error={errors?.[field.name]}
          onChange={(value) => onChange(field.name, value)}
          relationOptions={
            field.type === 'relation'
              ? relationRawOptions.map((item) => ({
                  value: String(item.id),
                  label: getLabel(item),
                }))
              : undefined
          }
        />
      ))}
    </div>
  );
}
