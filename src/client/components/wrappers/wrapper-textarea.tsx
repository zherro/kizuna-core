import type { FormikProps, FormikValues } from 'formik';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

type WrapperTextareaProps<TValues extends FormikValues> = {
  formik: FormikProps<TValues>;
  field: keyof TValues & string;
  label?: string;
  className?: string;
  placeholder?: string;
  rows?: number;
};

function toLabel(field: string) {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="textarea"`) instead. */
export function WrapperTextarea<TValues extends FormikValues>({
  formik,
  field,
  label,
  className,
  placeholder,
  rows = 4,
}: WrapperTextareaProps<TValues>) {
  const id = field;
  const rawValue = formik.values[field];
  const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
  const touched = Boolean(formik.touched[field]);
  const errorValue = formik.errors[field];
  const error = touched && typeof errorValue === 'string' ? errorValue : '';

  return (
    <div className={className ?? 'space-y-2'}>
      <Label htmlFor={id}>{label ?? toLabel(field)}</Label>
      <Textarea
        id={id}
        name={field}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => {
          void formik.setFieldValue(field, event.target.value);
        }}
        onBlur={formik.handleBlur}
      />
      {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
