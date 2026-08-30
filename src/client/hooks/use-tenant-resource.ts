'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from './use-toast';

type TenantRecord = { id?: string | number | null };

type ListResponse<T> = { items?: T[] };
type ItemResponse<T> = { item?: T; message?: string };

type UseTenantResourceOptions<T> = {
  resource: string;
  defaultItems: T[];
  pageSize?: number;
  loadErrorMessage?: string;
  saveErrorMessage?: string;
  saveSuccessMessage?: string;
  deleteErrorMessage?: string;
  deleteSuccessMessage?: string;
};

export function useTenantResource<T extends TenantRecord>({
  resource,
  defaultItems,
  pageSize = 100,
  loadErrorMessage = 'Nao foi possivel carregar os dados.',
  saveErrorMessage = 'Nao foi possivel salvar agora. Tente novamente.',
  saveSuccessMessage = 'Salvo com sucesso.',
  deleteErrorMessage = 'Nao foi possivel remover agora. Tente novamente.',
  deleteSuccessMessage = 'Removido com sucesso.',
}: UseTenantResourceOptions<T>) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [items, setItems] = useState<T[]>(defaultItems);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/resources/${resource}?page=1&pageSize=${pageSize}`, {
        cache: 'no-store',
      });
      const payload = ((await response.json().catch(() => null)) as ListResponse<T> | null) ?? {};

      if (!response.ok) {
        toastError(loadErrorMessage);
        return;
      }

      if (payload.items && payload.items.length > 0) {
        setItems(payload.items);
      }
    } catch {
      toastError(loadErrorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadErrorMessage, pageSize, resource, toastError]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (nextItems: T[]) => {
      setSaving(true);

      try {
        const saved: T[] = [];

        for (const item of nextItems) {
          const isUpdate = item.id != null;
          const response = await fetch(
            isUpdate ? `/api/resources/${resource}/${item.id}` : `/api/resources/${resource}`,
            {
              method: isUpdate ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            }
          );

          const payload =
            ((await response.json().catch(() => null)) as ItemResponse<T> | null) ?? {};

          if (!response.ok || !payload.item) {
            toastError(payload.message || saveErrorMessage);
            return false;
          }

          saved.push(payload.item);
        }

        setItems(saved);
        toastSuccess(saveSuccessMessage);
        return true;
      } catch {
        toastError(saveErrorMessage);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [resource, saveErrorMessage, saveSuccessMessage, toastError, toastSuccess]
  );

  const saveOne = useCallback(
    async (item: T) => {
      setSaving(true);

      try {
        const isUpdate = item.id != null;
        const response = await fetch(
          isUpdate ? `/api/resources/${resource}/${item.id}` : `/api/resources/${resource}`,
          {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          }
        );

        const payload = ((await response.json().catch(() => null)) as ItemResponse<T> | null) ?? {};

        if (!response.ok || !payload.item) {
          toastError(payload.message || saveErrorMessage);
          return false;
        }

        const saved = payload.item;
        setItems((prev) =>
          isUpdate
            ? prev.map((current) => (current.id === item.id ? saved : current))
            : [...prev, saved]
        );
        toastSuccess(saveSuccessMessage);
        return true;
      } catch {
        toastError(saveErrorMessage);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [resource, saveErrorMessage, saveSuccessMessage, toastError, toastSuccess]
  );

  const remove = useCallback(
    async (id: string | number) => {
      setSaving(true);

      try {
        const response = await fetch(`/api/resources/${resource}/${id}`, { method: 'DELETE' });
        const payload =
          ((await response.json().catch(() => null)) as { message?: string } | null) ?? {};

        if (!response.ok) {
          toastError(payload.message || deleteErrorMessage);
          return false;
        }

        setItems((prev) => prev.filter((item) => item.id !== id));
        toastSuccess(payload.message || deleteSuccessMessage);
        return true;
      } catch {
        toastError(deleteErrorMessage);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [deleteErrorMessage, deleteSuccessMessage, resource, toastError, toastSuccess]
  );

  return { items, setItems, loading, saving, load, save, saveOne, remove };
}
