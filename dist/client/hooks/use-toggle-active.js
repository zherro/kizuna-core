'use client';
import { useState } from 'react';
export function useToggleActive({ resource, itemId, currentStatus, onSuccess, onError, }) {
    const [toggling, setToggling] = useState(false);
    async function toggle() {
        if (!itemId)
            return;
        setToggling(true);
        try {
            const response = await fetch(`/api/resources/${resource}/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentStatus }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                onError?.(data.message || 'Erro ao alternar status');
                return;
            }
            onSuccess?.(!currentStatus);
        }
        catch {
            onError?.('Erro de conexão');
        }
        finally {
            setToggling(false);
        }
    }
    return { toggling, toggle };
}
//# sourceMappingURL=use-toggle-active.js.map