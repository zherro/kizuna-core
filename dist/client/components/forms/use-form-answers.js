'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
function coerceRow(raw) {
    const record = Array.isArray(raw) ? raw[0] : raw;
    if (!record || typeof record !== 'object')
        return null;
    const r = record;
    const pick = (camel, snake, fallback) => (r[camel] ?? r[snake] ?? fallback);
    return {
        id: pick('id', 'id', ''),
        formId: pick('formId', 'form_id', null),
        formKey: String(pick('formKey', 'form_key', '')),
        referenceId: String(pick('referenceId', 'reference_id', '')),
        domain: String(pick('domain', 'domain', '')),
        version: Number(pick('version', 'version', 1)),
        schemaSnapshot: (pick('schemaSnapshot', 'schema_snapshot', {}) ?? {}),
        answers: (pick('answers', 'answers', {}) ?? {}),
        submittedBy: pick('submittedBy', 'submitted_by', null),
        createdAt: pick('createdAt', 'created_at', undefined),
        updatedAt: pick('updatedAt', 'updated_at', undefined),
    };
}
export function useFormAnswers({ formKey, domain, referenceId, enabled = true, }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(enabled);
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
            const payload = (await response.json().catch(() => null));
            if (!activeRef.current)
                return;
            if (!response.ok) {
                setError(payload?.message || 'Nao foi possivel carregar as respostas do formulario.');
                return;
            }
            const first = Array.isArray(payload?.items) ? payload?.items[0] : null;
            setData(first ? coerceRow(first) : null);
        }
        catch {
            if (activeRef.current)
                setError('Erro de conexao ao carregar as respostas.');
        }
        finally {
            if (activeRef.current)
                setLoading(false);
        }
    }, [active, domain, referenceId, formKey]);
    useEffect(() => {
        activeRef.current = true;
        void reload();
        return () => {
            activeRef.current = false;
        };
    }, [reload]);
    const submit = useCallback(async (answers) => {
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
            const body = (await response.json().catch(() => null));
            if (!response.ok) {
                setError(body?.message || 'Nao foi possivel salvar as respostas.');
                return null;
            }
            const row = coerceRow(body?.payload);
            if (row)
                setData(row);
            return row;
        }
        catch {
            setError('Erro de conexao ao salvar as respostas.');
            return null;
        }
        finally {
            setSubmitting(false);
        }
    }, [formKey, referenceId, domain]);
    return { data, loading, error, submitting, reload, submit };
}
//# sourceMappingURL=use-form-answers.js.map