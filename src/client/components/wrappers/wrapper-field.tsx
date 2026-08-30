import type { HTMLInputTypeAttribute } from 'react';
import type { FormikProps, FormikValues } from 'formik';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type WrapperFieldProps<TValues extends FormikValues> = {
  formik: FormikProps<TValues>;
  field: keyof TValues & string;
  label?: string;
  className?: string;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  transform?: (value: string) => string;
};

function toLabel(field: string) {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="input"`) instead. */
export function WrapperField<TValues extends FormikValues>({
  formik,
  field,
  label,
  className,
  placeholder,
  type = 'text',
  inputMode,
  transform,
}: WrapperFieldProps<TValues>) {
  const id = field;
  const rawValue = formik.values[field];
  const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
  const touched = Boolean(formik.touched[field]);
  const errorValue = formik.errors[field];
  const error = touched && typeof errorValue === 'string' ? errorValue : '';

  return (
    <div className={className ?? 'space-y-2'}>
      <Label htmlFor={id}>{label ?? toLabel(field)}</Label>
      <Input
        id={id}
        name={field}
        value={value}
        onChange={(event) => {
          const nextValue = transform ? transform(event.target.value) : event.target.value;
          void formik.setFieldValue(field, nextValue);
        }}
        onBlur={formik.handleBlur}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
      />
      {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
