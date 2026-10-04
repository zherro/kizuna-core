import { parseActive } from '../utils/resource-utils';
import type { RpcConfig } from '@kizuna/core/types';
import type { ResourceConfig } from '../types/resource-config';

/**
 * `ResourceConfig`s do plugin `ai_review` (plugins/ai_review/0001_ai_review.sql). A RLS decide
 * quem vê e escreve (somente root, claim is_root do JWT); estes configs só
 * traduzem campos. Todos os mapInput incluem só o que veio no corpo (PATCH regrava o registro
 * inteiro na rota genérica).
 *
 * - `ai_credentials`: NUNCA expõe `key_cipher`. Criar/trocar a chave é rota do servidor
 *   (cifra AES-256-GCM no Node + RPC fn_ai_credential_save com o JWT do root); aqui só lista,
 *   renomeia e ativa/desativa.
 * - `service_text_revisions`: o revisor edita só `revised_text`; aprovar/rejeitar são as RPCs
 *   `fn_service_revision_apply` / `fn_service_revision_reject` (`rpcAiReview`).
 * - `ai_review_runs`: leitura; o único PATCH permitido é status = cancelled.
 * - `ai_prompts`: CRUD pelo gestor; `version` sobe por trigger quando o texto muda.
 */
type RecordValue = Record<string, unknown>;

const PROVIDERS = ['gemini', 'claude', 'openai'];
const text = (value: unknown) => String(value ?? '').trim();
const textOrNull = (value: unknown) => text(value) || null;
const numOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const pick = (input: RecordValue, camel: string, snake: string) => input[camel] ?? input[snake];

export const rpcAiReview: Record<string, RpcConfig> = {
  fn_service_revision_apply: { schema: 'public' },
  fn_service_revision_reject: { schema: 'public' },
};

export const resourceAiReview: Record<string, ResourceConfig> = {
  ai_credentials: {
    schema: 'public',
    table: 'ai_credentials',
    listRequiresAuth: true,
    returnRepresentation: true,
    // key_cipher fica de fora de propósito (o GRANT de coluna também o esconde).
    select: 'id,provider,label,key_last4,active,created_by,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'created_at.desc',
    searchableColumns: ['label', 'provider'],
    mapInput: (input) => {
      const out: RecordValue = {};
      if (input.label !== undefined) out.label = textOrNull(input.label);
      if (input.active !== undefined) out.active = parseActive(input.active);
      if (Object.keys(out).length) out.updated_at = new Date().toISOString();
      return out;
    },
    mapOutput: (record) => ({
      id: record.id,
      provider: String(record.provider ?? ''),
      label: record.label ?? null,
      keyLast4: record.key_last4 ?? null,
      active: parseActive(record.active),
      createdBy: record.created_by ?? null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }),
  },
  ai_prompts: {
    schema: 'public',
    table: 'ai_prompts',
    listRequiresAuth: true,
    returnRepresentation: true,
    select:
      'id,key,name,description,system_prompt,user_template,provider,model,temperature,version,category_id,active,created_by,created_at,updated_at',
    primaryKey: 'id',
    defaultOrder: 'key',
    searchableColumns: ['key', 'name', 'description'],
    maxPageSize: 200,
    mapInput: (input) => {
      const out: RecordValue = {};
      if (input.key !== undefined) out.key = text(input.key);
      if (input.name !== undefined) out.name = text(input.name);
      if (input.description !== undefined) out.description = textOrNull(input.description);
      const systemPrompt = pick(input, 'systemPrompt', 'system_prompt');
      if (systemPrompt !== undefined) out.system_prompt = String(systemPrompt ?? '');
      const userTemplate = pick(input, 'userTemplate', 'user_template');
      if (userTemplate !== undefined) out.user_template = String(userTemplate ?? '');
      if (input.provider !== undefined) {
        const provider = text(input.provider);
        out.provider = PROVIDERS.includes(provider) ? provider : null;
      }
      if (input.model !== undefined) out.model = textOrNull(input.model);
      if (input.temperature !== undefined) out.temperature = numOrNull(input.temperature);
      const categoryId = pick(input, 'categoryId', 'category_id');
      if (categoryId !== undefined) out.category_id = numOrNull(categoryId);
      if (input.active !== undefined) out.active = parseActive(input.active);
      return out;
    },
    mapOutput: (record) => ({
      id: record.id,
      key: String(record.key ?? ''),
      name: String(record.name ?? ''),
      description: record.description ?? '',
      systemPrompt: String(record.system_prompt ?? ''),
      userTemplate: String(record.user_template ?? ''),
      provider: record.provider ?? null,
      model: record.model ?? null,
      temperature: record.temperature == null ? null : Number(record.temperature),
      version: Number(record.version ?? 1),
      categoryId: record.category_id ?? null,
      active: parseActive(record.active),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }),
  },
  service_text_revisions: {
    schema: 'public',
    table: 'service_text_revisions',
    listRequiresAuth: true,
    returnRepresentation: true,
    // `service` embute o anúncio (RLS de services: pode vir nulo se não estiver ativo).
    select:
      'id,service_id,field,original_text,revised_text,status,origin,provider,model,prompt_version,tokens_in,tokens_out,run_id,reviewed_by,reviewed_at,created_at,tenant_id,service:services(id,uid,title,category_id,status)',
    primaryKey: 'id',
    defaultOrder: 'created_at.desc',
    searchableColumns: ['original_text', 'revised_text'],
    mapInput: (input) => {
      const out: RecordValue = {};
      const revisedText = pick(input, 'revisedText', 'revised_text');
      if (revisedText !== undefined) out.revised_text = String(revisedText ?? '');
      return out;
    },
    mapOutput: (record) => {
      const service = (record.service ?? null) as RecordValue | null;
      return {
        id: record.id,
        serviceId: record.service_id,
        field: String(record.field ?? 'description'),
        originalText: record.original_text ?? '',
        revisedText: record.revised_text ?? '',
        status: String(record.status ?? 'pending'),
        origin: String(record.origin ?? 'ai'),
        provider: record.provider ?? null,
        model: record.model ?? null,
        promptVersion: record.prompt_version ?? null,
        tokensIn: record.tokens_in ?? null,
        tokensOut: record.tokens_out ?? null,
        runId: record.run_id ?? null,
        reviewedBy: record.reviewed_by ?? null,
        reviewedAt: record.reviewed_at ?? null,
        createdAt: record.created_at,
        service: service
          ? {
              id: service.id,
              uid: service.uid ?? null,
              title: String(service.title ?? ''),
              categoryId: service.category_id ?? null,
              status: service.status ?? null,
            }
          : null,
      };
    },
  },
  ai_review_runs: {
    schema: 'public',
    table: 'ai_review_runs',
    listRequiresAuth: true,
    returnRepresentation: true,
    select:
      'id,category_id,requested_limit,include_reviewed,status,total,processed,failed,tokens_in,tokens_out,error,created_by,created_at,finished_at',
    primaryKey: 'id',
    defaultOrder: 'created_at.desc',
    searchableColumns: [],
    mapInput: (input) => {
      const out: RecordValue = {};
      // Único PATCH que o banco aceita do gestor: cancelar uma execução em andamento.
      if (input.status !== undefined && text(input.status) === 'cancelled') out.status = 'cancelled';
      return out;
    },
    mapOutput: (record) => ({
      id: record.id,
      categoryId: record.category_id ?? null,
      requestedLimit: record.requested_limit ?? null,
      includeReviewed: Boolean(record.include_reviewed),
      status: String(record.status ?? 'pending'),
      total: Number(record.total ?? 0),
      processed: Number(record.processed ?? 0),
      failed: Number(record.failed ?? 0),
      tokensIn: Number(record.tokens_in ?? 0),
      tokensOut: Number(record.tokens_out ?? 0),
      error: record.error ?? null,
      createdBy: record.created_by ?? null,
      createdAt: record.created_at,
      finishedAt: record.finished_at ?? null,
    }),
  },
};
