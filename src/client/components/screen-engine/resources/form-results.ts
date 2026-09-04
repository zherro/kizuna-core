/**
 * Server-side `postgrestResources` config for the `form_results` plugin table (captured answers).
 * Read/list mainly — writes go through the `fn_form_result_upsert` RPC (see
 * `components/forms/use-form-answers.ts`), never a direct POST/PATCH, because the singleton key
 * is composite `(domain, reference_id)` with no id known at capture time. `mapInput` is kept
 * minimal for the rare admin correction case.
 */

import type { PostgrestResourceConfig } from './forms';

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export const FORM_RESULTS_RESOURCE: PostgrestResourceConfig = {
  schema: 'public',
  table: 'form_results',
  select:
    'id,uid,form_id,form_key,reference_id,domain,version,schema_snapshot,answers,submitted_by,created_at,updated_at',
  primaryKey: 'id',
  defaultOrder: 'updated_at',
  searchableColumns: ['form_key', 'domain', 'reference_id'],
  maxPageSize: 200,
  mapInput: (input) => ({
    answers: toObject(input.answers),
  }),
  mapOutput: (record) => ({
    id: record.id,
    uid: record.uid,
    formId: record.form_id ?? record.formId ?? null,
    formKey: record.form_key ?? record.formKey ?? '',
    referenceId: record.reference_id ?? record.referenceId ?? '',
    domain: record.domain ?? '',
    version: Number(record.version ?? 1),
    schemaSnapshot: toObject(record.schema_snapshot ?? record.schemaSnapshot),
    answers: toObject(record.answers),
    submittedBy: record.submitted_by ?? record.submittedBy ?? null,
    createdAt: record.created_at ?? record.createdAt,
    updatedAt: record.updated_at ?? record.updatedAt,
  }),
};

export const resourceFormResults: Record<string, PostgrestResourceConfig> = {
  form_results: FORM_RESULTS_RESOURCE,
};
