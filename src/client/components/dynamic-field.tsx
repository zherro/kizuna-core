'use client';

import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { SearchableSelect } from './ui/searchable-select';
import type { ResourceScreenField } from '../../types/resource-screen';

type DynamicFieldProps = {
  field: ResourceScreenField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  /** Only read when `field.type === 'relation'` — pre-loaded by the caller (`resource-screen.tsx`), never fetched here. */
  relationOptions?: Array<{ value: string; label: string }>;
};

/**
 * Renders exactly one field from a `ResourceScreenField` config. Framework-agnostic on purpose:
 * takes a plain `value`/`onChange`, not a Formik binding, so `ResourceScreen` drives it without
 * either depending on the other's state management.
 */
export function DynamicField({
  field,
  value,
  error,
  onChange,
  onBlur,
  relationOptions,
}: Readonly<DynamicFieldProps>) {
  if (field.type === 'switch') {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div>
          <Label htmlFor={field.name}>{field.label}</Label>
          {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
        </div>
        <Switch id={field.name} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>{field.label}</Label>
        <Textarea
          id={field.name}
          name={field.name}
          value={String(value ?? '')}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    );
  }

  if (field.type === 'relation' || field.type === 'select') {
    const options = field.type === 'select' ? field.options : (relationOptions ?? []);

    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>{field.label}</Label>
        <SearchableSelect
          id={field.name}
          value={String(value ?? '')}
          onChange={onChange}
          onBlur={onBlur}
          options={options}
          placeholder={field.placeholder ?? 'Selecione...'}
          disabled={options.length === 0}
        />
        {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>{field.label}</Label>
      <Input
        id={field.name}
        name={field.name}
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
