'use client';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from './use-toast';
export function useTenantResource({ resource, defaultItems, pageSize = 100, loadErrorMessage = 'Nao foi possivel carregar os dados.', saveErrorMessage = 'Nao foi possivel salvar agora. Tente novamente.', saveSuccessMessage = 'Salvo com sucesso.', deleteErrorMessage = 'Nao foi possivel remover agora. Tente novamente.', deleteSuccessMessage = 'Removido com sucesso.', }) {
    const { error: toastError, success: toastSuccess } = useToast();
    const [items, setItems] = useState(defaultItems);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/resources/${resource}?page=1&pageSize=${pageSize}`, {
                cache: 'no-store',
            });
            const payload = (await response.json().catch(() => null)) ?? {};
            if (!response.ok) {
                toastError(loadErrorMessage);
                return;
            }
            if (payload.items && payload.items.length > 0) {
                setItems(payload.items);
            }
        }
        catch {
            toastError(loadErrorMessage);
        }
        finally {
            setLoading(false);
        }
    }, [loadErrorMessage, pageSize, resource, toastError]);
    useEffect(() => {
        void load();
    }, [load]);
    const save = useCallback(async (nextItems) => {
        setSaving(true);
        try {
            const saved = [];
            for (const item of nextItems) {
                const isUpdate = item.id != null;
                const response = await fetch(isUpdate ? `/api/resources/${resource}/${item.id}` : `/api/resources/${resource}`, {
                    method: isUpdate ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                });
                const payload = (await response.json().catch(() => null)) ?? {};
                if (!response.ok || !payload.item) {
                    toastError(payload.message || saveErrorMessage);
                    return false;
                }
                saved.push(payload.item);
            }
            setItems(saved);
            toastSuccess(saveSuccessMessage);
            return true;
        }
        catch {
            toastError(saveErrorMessage);
            return false;
        }
        finally {
            setSaving(false);
        }
    }, [resource, saveErrorMessage, saveSuccessMessage, toastError, toastSuccess]);
    const saveOne = useCallback(async (item) => {
        setSaving(true);
        try {
            const isUpdate = item.id != null;
            const response = await fetch(isUpdate ? `/api/resources/${resource}/${item.id}` : `/api/resources/${resource}`, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });
            const payload = (await response.json().catch(() => null)) ?? {};
            if (!response.ok || !payload.item) {
                toastError(payload.message || saveErrorMessage);
                return false;
            }
            const saved = payload.item;
            setItems((prev) => isUpdate
                ? prev.map((current) => (current.id === item.id ? saved : current))
                : [...prev, saved]);
            toastSuccess(saveSuccessMessage);
            return true;
        }
        catch {
            toastError(saveErrorMessage);
            return false;
        }
        finally {
            setSaving(false);
        }
    }, [resource, saveErrorMessage, saveSuccessMessage, toastError, toastSuccess]);
    const remove = useCallback(async (id) => {
        setSaving(true);
        try {
            const response = await fetch(`/api/resources/${resource}/${id}`, { method: 'DELETE' });
            const payload = (await response.json().catch(() => null)) ?? {};
            if (!response.ok) {
                toastError(payload.message || deleteErrorMessage);
                return false;
            }
            setItems((prev) => prev.filter((item) => item.id !== id));
            toastSuccess(payload.message || deleteSuccessMessage);
            return true;
        }
        catch {
            toastError(deleteErrorMessage);
            return false;
        }
        finally {
            setSaving(false);
        }
    }, [deleteErrorMessage, deleteSuccessMessage, resource, toastError, toastSuccess]);
    return { items, setItems, loading, saving, load, save, saveOne, remove };
}
//# sourceMappingURL=use-tenant-resource.js.map