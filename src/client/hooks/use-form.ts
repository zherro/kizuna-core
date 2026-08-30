'use client';

import { useCallback, useState } from 'react';
import { useFormik, type FormikConfig, type FormikValues } from 'formik';

type SubmitContext<TValues extends FormikValues> = {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
  clearFeedback: () => void;
  reset: () => void;
  resetForm: (values: TValues) => void;
};

type ResourceSubmitConfig<TValues extends FormikValues, TPayload, TItem> = {
  resource: string;
  selectedId?: string | null;
  toPayload?: (values: TValues) => TPayload;
  errorMessage: string;
  successMessage: string;
  connectionErrorMessage: string;
  onSuccess?: (result: any, context: SubmitContext<TValues>) => Promise<void> | void;
};

type UseFormOptions<TValues extends FormikValues, TPayload, TItem> = {
  initialValues: FormikConfig<TValues>['initialValues'];
  validationSchema?: FormikConfig<TValues>['validationSchema'];
  onSubmit?: (values: TValues, context: SubmitContext<TValues>) => Promise<void> | void;
  resourceSubmit?: ResourceSubmitConfig<TValues, TPayload, TItem>;
  onReset?: () => void;
};

export function useForm<TValues extends FormikValues, TPayload = unknown, TItem = unknown>({
  initialValues,
  validationSchema,
  onSubmit,
  resourceSubmit,
  onReset,
}: UseFormOptions<TValues, TPayload, TItem>) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearFeedback = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const formik = useFormik<TValues>({
    initialValues,
    validationSchema,
    onSubmit: async (values) => {
      clearFeedback();
      setSubmitting(true);

      try {
        const context: SubmitContext<TValues> = {
          setError,
          setSuccess,
          clearFeedback,
          reset,
          resetForm,
        };

        if (resourceSubmit) {
          const payload = resourceSubmit.toPayload ? resourceSubmit.toPayload(values) : values;
          const method = resourceSubmit.selectedId ? 'PATCH' : 'POST';
          const url = resourceSubmit.selectedId
            ? `/api/resources/${resourceSubmit.resource}/${resourceSubmit.selectedId}`
            : `/api/resources/${resourceSubmit.resource}`;

          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            setError(data.message || resourceSubmit.errorMessage);
            return;
          }

          setSuccess(data.message || resourceSubmit.successMessage);

          if (resourceSubmit.onSuccess) {
            await resourceSubmit.onSuccess(data, context);
          }
          return;
        }

        if (onSubmit) {
          await onSubmit(values, context);
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  const resetForm = useCallback(
    (values: TValues) => {
      formik.resetForm({ values });
      formik.setTouched({});
      formik.setErrors({});
      setError('');
      onReset?.();
    },
    [formik, onReset]
  );

  const reset = useCallback(() => {
    formik.resetForm({ values: initialValues });
    formik.setTouched({});
    formik.setErrors({});
    setError('');
    onReset?.();
  }, [formik, initialValues, onReset]);

  return {
    formik,
    submitting,
    error,
    success,
    setError,
    setSuccess,
    clearFeedback,
    reset,
    resetForm,
    handleSubmit: formik.handleSubmit,
  };
}
