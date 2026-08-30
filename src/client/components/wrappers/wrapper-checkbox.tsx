import type { FormikProps, FormikValues } from 'formik';

type WrapperCheckboxProps<TValues extends FormikValues> = {
  formik: FormikProps<TValues>;
  field: keyof TValues & string;
  label: string;
  className?: string;
};

/** @deprecated Use `FormField` from `@/components/ui-better-soft/forms/form-field` (`as="switch"`) instead. */
export function WrapperCheckbox<TValues extends FormikValues>({
  formik,
  field,
  label,
  className,
}: WrapperCheckboxProps<TValues>) {
  const id = field;
  const checked = Boolean(formik.values[field]);
  const touched = Boolean(formik.touched[field]);
  const errorValue = formik.errors[field];
  const error = touched && typeof errorValue === 'string' ? errorValue : '';

  return (
    <div className={className ?? 'space-y-1'}>
      <label htmlFor={id} className="inline-flex items-center gap-2 text-sm">
        <input
          id={id}
          name={field}
          type="checkbox"
          className="h-4 w-4"
          checked={checked}
          onChange={(event) => void formik.setFieldValue(field, event.target.checked)}
          onBlur={formik.handleBlur}
        />
        {label}
      </label>
      {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
