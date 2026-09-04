'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormSchema, FormValues } from '../form-builder';

/**
 * Loads (and upserts) the current `form_results` row for a `(formKey, domain, referenceId)`
 * triple. Reads go through the generic resource route; the write goes through the
 * `fn_form_result_upsert` RPC via the consuming app's `/api/postgrest/rpc` proxy — never a
 * direct POST/PATCH, because the singleton key is composite and no row id is known at capture
 * time (see the forms-manager design doc + `.claude/domains/forms.md`).
 */

export type FormAnswerRow = {
  id: string | number;
  formId: string | number | null;
  formKey: string;
  referenceId: string;
  domain: string;
  version: number;
  schemaSnapshot: FormSchema;
  answers: FormValues;
  submittedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UseFormAnswersArgs = {
  formKey: string;
  domain: string;
  referenceId: string;
  /** Skip loading until the caller has a real referenceId / formKey. */
  enabled?: boolean;
};

type UseFormAnswersResult = {
  data: FormAnswerRow | null;
  loading: boolean;
  error: string;
  submitting: boolean;
  reload: () => Promise<void>;
  submit: (answers: FormValues) => Promise<FormAnswerRow | null>;
};

function coerceRow(raw: unknown): FormAnswerRow | null {
  const record = Array.isArray(raw) ? raw[0] : raw;
  if (!record || typeof record !== 'object') return null;
  const r = record as Record<string, unknown>;
  const pick = <T>(camel: string, snake: string, fallback: T): T =>
    (r[camel] ?? r[snake] ?? fallback) as T;
  return {
    id: pick('id', 'id', '') as string | number,
    formId: pick('formId', 'form_id', null),
    formKey: String(pick('formKey', 'form_key', '')),
    referenceId: String(pick('referenceId', 'reference_id', '')),
    domain: String(pick('domain', 'domain', '')),
    version: Number(pick('version', 'version', 1)),
    schemaSnapshot: (pick('schemaSnapshot', 'schema_snapshot', {}) ?? {}) as FormSchema,
    answers: (pick('answers', 'answers', {}) ?? {}) as FormValues,
    submittedBy: pick('submittedBy', 'submitted_by', null),
    createdAt: pick('createdAt', 'created_at', undefined),
    updatedAt: pick('updatedAt', 'updated_at', undefined),
  };
}

export function useFormAnswers({
  formKey,
  domain,
  referenceId,
  enabled = true,
}: UseFormAnswersArgs): UseFormAnswersResult {
  const [data, setData] = useState<FormAnswerRow | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(true);

  const active = enabled && Boolean(formKey) && Boolean(referenceId) && Boolean(domain);

  const reload = useCallback(async () => {
    if (!active) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        page: '1',
        pageSize: '1',
        'filter.domain': domain,
        'filter.reference_id': referenceId,
        'filter.form_key': formKey,
      });
      const response = await fetch(`/api/resources/form_results?${query.toString()}`, {
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as
        | { items?: unknown[]; message?: string }
        | null;
      if (!activeRef.current) return;
      if (!response.ok) {
        setError(payload?.message || 'Nao foi possivel carregar as respostas do formulario.');
        return;
      }
      const first = Array.isArray(payload?.items) ? payload?.items[0] : null;
      setData(first ? coerceRow(first) : null);
    } catch {
      if (activeRef.current) setError('Erro de conexao ao carregar as respostas.');
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [active, domain, referenceId, formKey]);

  useEffect(() => {
    activeRef.current = true;
    void reload();
    return () => {
      activeRef.current = false;
    };
  }, [reload]);

  const submit = useCallback(
    async (answers: FormValues) => {
      if (!formKey || !referenceId || !domain) {
        setError('Formulario sem chave/referencia — nao e possivel salvar.');
        return null;
      }
      setSubmitting(true);
      setError('');
      try {
        const response = await fetch('/api/postgrest/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema: 'public',
            functionName: 'fn_form_result_upsert',
            params: {
              p_form_key: formKey,
              p_domain: domain,
              p_reference_id: referenceId,
              p_answers: answers ?? {},
            },
          }),
        });
        const body = (await response.json().catch(() => null)) as
          | { payload?: unknown; message?: string }
          | null;
        if (!response.ok) {
          setError(body?.message || 'Nao foi possivel salvar as respostas.');
          return null;
        }
        const row = coerceRow(body?.payload);
        if (row) setData(row);
        return row;
      } catch {
        setError('Erro de conexao ao salvar as respostas.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [formKey, referenceId, domain]
  );

  return { data, loading, error, submitting, reload, submit };
}
