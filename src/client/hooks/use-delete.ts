'use client';

import { useState } from 'react';

type DeleteResponse = {
  message?: string;
};

type UseDeleteOptions = {
  resource: string;
  selectedId?: string | null;
  errorMessage: string;
  successMessage: string;
  connectionErrorMessage: string;
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
  onSuccess?: () => Promise<void> | void;
};

export function useDelete({
  resource,
  selectedId,
  errorMessage,
  successMessage,
  connectionErrorMessage,
  setError,
  setSuccess,
  onSuccess,
}: UseDeleteOptions) {
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!selectedId) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/resources/${resource}/${selectedId}`, {
        method: 'DELETE',
      });

      const data = ((await response.json().catch(() => null)) as DeleteResponse | null) ?? {};

      if (!response.ok) {
        setError(data.message || errorMessage);
        return;
      }

      setSuccess(data.message || successMessage);
      if (onSuccess) {
        await onSuccess();
      }
    } catch {
      setError(connectionErrorMessage);
    } finally {
      setDeleting(false);
    }
  }

  return {
    deleting,
    remove,
  };
}
