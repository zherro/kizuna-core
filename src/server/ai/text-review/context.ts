/**
 * Contexto de um anúncio para a revisão de texto: categoria, grupo, subcategorias e as respostas
 * do formulário dinâmico (`form_results`, rotuladas pelo schema do formulário quando possível).
 */

import { serviceTable } from '../../service-db';

export interface ServiceReviewContext {
  serviceId: number;
  tenantId: string | null;
  title: string;
  description: string;
  categoryId: number | null;
  category: string;
  categoryDescription: string;
  group: string;
  subcategories: string[];
  /** Linhas "Rótulo: valor" prontas para o prompt. */
  fields: string;
}

type SchemaField = {
  key?: string;
  label?: string;
  type?: string;
  options?: Array<{ value?: unknown; label?: string }>;
  itemFields?: SchemaField[];
};

const SKIP_TYPES = new Set(['password', 'upload', 'image', 'file', 'color']);

function formatValue(field: SchemaField | undefined, value: unknown): string {
  if (value === null || value === undefined) return '';
  const optLabel = (v: unknown) => {
    const o = field?.options?.find((x) => String(x.value) === String(v));
    return o?.label ?? String(v);
  };
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === 'object' && value[0] !== null) {
      return value
        .map((item, i) => {
          const parts = Object.entries(item as Record<string, unknown>)
            .map(([k, v]) => {
              const sub = field?.itemFields?.find((f) => f.key === k);
              if (sub && SKIP_TYPES.has(String(sub.type))) return '';
              const t = formatValue(sub, v);
              return t ? `${sub?.label ?? k}: ${t}` : '';
            })
            .filter(Boolean);
          return parts.length ? `(${i + 1}) ${parts.join(', ')}` : '';
        })
        .filter(Boolean)
        .join('; ');
    }
    return value.map(optLabel).join(', ');
  }
  if (typeof value === 'object') return '';
  return optLabel(value).trim();
}

/** Monta as linhas "Rótulo: valor" das respostas, usando o schema para rótulos e opções. */
export function formatAnswers(
  schema: { fields?: SchemaField[] } | null | undefined,
  answers: Record<string, unknown> | null | undefined
): string {
  if (!answers || typeof answers !== 'object') return '';
  const byKey = new Map<string, SchemaField>();
  for (const f of schema?.fields ?? []) if (f?.key) byKey.set(f.key, f);

  const lines: string[] = [];
  for (const [key, value] of Object.entries(answers)) {
    const field = byKey.get(key);
    if (field && SKIP_TYPES.has(String(field.type))) continue;
    const text = formatValue(field, value);
    if (!text) continue;
    lines.push(`- ${field?.label ?? key}: ${text}`);
  }
  return lines.join('\n');
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await serviceTable(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function buildServiceContext(serviceId: number): Promise<ServiceReviewContext> {
  const rows = await getJson<
    Array<{
      id: number;
      tenant_id?: string | null;
      title?: string | null;
      description?: string | null;
      category_id?: number | null;
      category?: { name?: string | null; description?: string | null } | null;
      group?: { name?: string | null } | null;
    }>
  >(
    `/services?id=eq.${serviceId}&select=id,tenant_id,title,description,category_id,` +
      `category:categories(name,description),group:categories_group(name)&limit=1`
  );
  const s = rows?.[0];
  if (!s) throw new Error(`Serviço ${serviceId} não encontrado.`);

  const subs = await getJson<Array<{ sub?: { name?: string | null } | null }>>(
    `/service_categories_sub?service_id=eq.${serviceId}&active=eq.true&select=sub:categories_sub(name)`
  );

  const fr = await getJson<
    Array<{ form_key?: string; answers?: Record<string, unknown>; schema_snapshot?: { fields?: SchemaField[] } }>
  >(
    `/form_results?domain=eq.service&reference_id=eq.${serviceId}` +
      `&select=form_key,answers,schema_snapshot&limit=1`
  );
  const result = fr?.[0];
  let schema = result?.schema_snapshot;
  if ((!schema || !schema.fields?.length) && result?.form_key) {
    const forms = await getJson<Array<{ schema?: { fields?: SchemaField[] } }>>(
      `/forms?form_key=eq.${encodeURIComponent(result.form_key)}&active=eq.true&select=schema&limit=1`
    );
    schema = forms?.[0]?.schema;
  }

  return {
    serviceId,
    tenantId: s.tenant_id ?? null,
    title: String(s.title ?? '').trim(),
    description: String(s.description ?? ''),
    categoryId: s.category_id != null ? Number(s.category_id) : null,
    category: String(s.category?.name ?? '').trim(),
    categoryDescription: String(s.category?.description ?? '').trim(),
    group: String(s.group?.name ?? '').trim(),
    subcategories: (subs ?? []).map((r) => String(r.sub?.name ?? '').trim()).filter(Boolean),
    fields: formatAnswers(schema, result?.answers),
  };
}
