'use client';
import { useCallback, useState } from 'react';
import { useFormik } from 'formik';
export function useForm({ initialValues, validationSchema, onSubmit, resourceSubmit, onReset, }) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const clearFeedback = useCallback(() => {
        setError('');
        setSuccess('');
    }, []);
    const formik = useFormik({
        initialValues,
        validationSchema,
        onSubmit: async (values) => {
            clearFeedback();
            setSubmitting(true);
            try {
                const context = {
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
            }
            finally {
                setSubmitting(false);
            }
        },
    });
    const resetForm = useCallback((values) => {
        formik.resetForm({ values });
        formik.setTouched({});
        formik.setErrors({});
        setError('');
        onReset?.();
    }, [formik, onReset]);
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
//# sourceMappingURL=use-form.js.map