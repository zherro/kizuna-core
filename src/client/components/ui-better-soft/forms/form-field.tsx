'use client';

import type { HTMLAttributes, HTMLInputTypeAttribute } from 'react';
import type { FormikProps, FormikValues } from 'formik';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';

type FormFieldBaseProps<TValues extends FormikValues> = {
  formik: FormikProps<TValues>;
  field: keyof TValues & string;
  label?: string;
  description?: string;
  className?: string;
};

type FormFieldInputProps<TValues extends FormikValues> = FormFieldBaseProps<TValues> & {
  as?: 'input';
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  transform?: (value: string) => string;
};

type FormFieldTextareaProps<TValues extends FormikValues> = FormFieldBaseProps<TValues> & {
  as: 'textarea';
  placeholder?: string;
  rows?: number;
};

type FormFieldSwitchProps<TValues extends FormikValues> = FormFieldBaseProps<TValues> & {
  as: 'switch';
};

type FormFieldProps<TValues extends FormikValues> =
  | FormFieldInputProps<TValues>
  | FormFieldTextareaProps<TValues>
  | FormFieldSwitchProps<TValues>;

function toLabel(field: string) {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/**
 * Normalized replacement for `wrapper-field.tsx` / `wrapper-checkbox.tsx` /
 * `wrapper-textarea.tsx` (see `src/components/wrraper/`, now deprecated) —
 * one Formik-bound field component covering input, textarea and switch,
 * styled with this app's fixed visual language instead of raw wrapper markup.
 */
export function FormField<TValues extends FormikValues>(props: Readonly<FormFieldProps<TValues>>) {
  const { formik, field, label, description, className } = props;
  const id = field;
  const touched = Boolean(formik.touched[field]);
  const errorValue = formik.errors[field];
  const error = touched && typeof errorValue === 'string' ? errorValue : '';
  const resolvedLabel = label ?? toLabel(field);

  if (props.as === 'switch') {
    const checked = Boolean(formik.values[field]);

    return (
      <div
        className={
          className ?? 'flex items-center justify-between rounded-xl border border-border p-3'
        }
      >
        <div>
          <Label htmlFor={id}>{resolvedLabel}</Label>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
          {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={(value) => void formik.setFieldValue(field, value)}
        />
      </div>
    );
  }

  const rawValue = formik.values[field];
  const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');

  if (props.as === 'textarea') {
    return (
      <div className={className ?? 'space-y-2'}>
        <Label htmlFor={id}>{resolvedLabel}</Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        <Textarea
          id={id}
          name={field}
          value={value}
          rows={props.rows ?? 4}
          placeholder={props.placeholder}
          onChange={(event) => void formik.setFieldValue(field, event.target.value)}
          onBlur={formik.handleBlur}
        />
        {error ? (
          <p
            className="text-xs text-red-400
        "
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className ?? 'space-y-2'}>
      <Label htmlFor={id}>{resolvedLabel}</Label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <Input
        id={id}
        name={field}
        value={value}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        onChange={(event) => {
          const nextValue = props.transform
            ? props.transform(event.target.value)
            : event.target.value;
          void formik.setFieldValue(field, nextValue);
        }}
        onBlur={formik.handleBlur}
      />
      {error ? (
        <p
          className="text-xs text-red-400
      "
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
