import { translateApiErrorMessage } from './api-error-message';
/**
 * Generic helper for create/update requests against /api/resources/:resource.
 * It centralizes method/url selection, payload serialization and default
 * error/success feedback handling.
 */
export async function submitResource({ resource, values, selectedId, toPayload, errorMessage, successMessage, connectionErrorMessage, setError, setSuccess, }) {
    const isEditing = Boolean(selectedId);
    const url = isEditing ? `/api/resources/${resource}/${selectedId}` : `/api/resources/${resource}`;
    const method = isEditing ? 'PUT' : 'POST';
    const payload = toPayload ? toPayload(values) : values;
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => null)) ?? {};
        if (!response.ok) {
            setError(translateApiErrorMessage(data.message, errorMessage));
            return { ok: false, data: null };
        }
        setSuccess(data.message || successMessage);
        return { ok: true, data };
    }
    catch {
        setError(connectionErrorMessage);
        return { ok: false, data: null };
    }
}
//# sourceMappingURL=resource-submit.js.map