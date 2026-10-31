'use client';
import { useState } from 'react';
export function useDelete({ resource, selectedId, errorMessage, successMessage, connectionErrorMessage, setError, setSuccess, onSuccess, }) {
    const [deleting, setDeleting] = useState(false);
    async function remove() {
        if (!selectedId)
            return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/resources/${resource}/${selectedId}`, {
                method: 'DELETE',
            });
            const data = (await response.json().catch(() => null)) ?? {};
            if (!response.ok) {
                setError(data.message || errorMessage);
                return;
            }
            setSuccess(data.message || successMessage);
            if (onSuccess) {
                await onSuccess();
            }
        }
        catch {
            setError(connectionErrorMessage);
        }
        finally {
            setDeleting(false);
        }
    }
    return {
        deleting,
        remove,
    };
}
//# sourceMappingURL=use-delete.js.map