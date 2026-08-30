import { translateApiErrorMessage } from '@/lib/api-error-message';

type MutationResponse<TItem> = {
  message?: string;
  item?: TItem;
};

type SubmitResourceOptions<TValues, TPayload> = {
  resource: string;
  values: TValues;
  selectedId?: string | null;
  toPayload?: (values: TValues) => TPayload;
  errorMessage: string;
  successMessage: string;
  connectionErrorMessage: string;
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
};

/**
 * Generic helper for create/update requests against /api/resources/:resource.
 * It centralizes method/url selection, payload serialization and default
 * error/success feedback handling.
 */
export async function submitResource<TValues, TPayload = TValues, TItem = unknown>({
  resource,
  values,
  selectedId,
  toPayload,
  errorMessage,
  successMessage,
  connectionErrorMessage,
  setError,
  setSuccess,
}: SubmitResourceOptions<TValues, TPayload>) {
  const isEditing = Boolean(selectedId);
  const url = isEditing ? `/api/resources/${resource}/${selectedId}` : `/api/resources/${resource}`;
  const method = isEditing ? 'PUT' : 'POST';
  const payload = toPayload ? toPayload(values) : (values as unknown as TPayload);

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data =
      ((await response.json().catch(() => null)) as MutationResponse<TItem> | null) ?? {};

    if (!response.ok) {
      setError(translateApiErrorMessage(data.message, errorMessage));
      return { ok: false as const, data: null };
    }

    setSuccess(data.message || successMessage);
    return { ok: true as const, data };
  } catch {
    setError(connectionErrorMessage);
    return { ok: false as const, data: null };
  }
}
