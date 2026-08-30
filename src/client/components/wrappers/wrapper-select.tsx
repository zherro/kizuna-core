import type { FormikProps, FormikValues } from 'formik';
import { Label } from '../ui/label';

type SelectOption = {
  value: string;
  label: string;
};

type WrapperSelectProps<TValues extends FormikValues> = {
  formik: FormikProps<TValues>;
  field: keyof TValues & string;
  label?: string;
  className?: string;
  options: SelectOption[];
  placeholder?: string;
  onValueChange?: (value: string, formik: FormikProps<TValues>) => void;
};

function toLabel(field: string) {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

export function WrapperSelect<TValues extends FormikValues>({
  formik,
  field,
  label,
  className,
  options,
  placeholder,
  onValueChange,
}: WrapperSelectProps<TValues>) {
  const id = field;
  const rawValue = formik.values[field];
  const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
  const touched = Boolean(formik.touched[field]);
  const errorValue = formik.errors[field];
  const error = touched && typeof errorValue === 'string' ? errorValue : '';

  return (
    <div className={className ?? 'space-y-2'}>
      <Label htmlFor={id}>{label ?? toLabel(field)}</Label>
      <select
        id={id}
        name={field}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(event) => {
          if (onValueChange) {
            onValueChange(event.target.value, formik);
            return;
          }
          void formik.setFieldValue(field, event.target.value);
        }}
        onBlur={formik.handleBlur}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
