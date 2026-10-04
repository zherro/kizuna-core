/**
 * Revisa a descrição de UM anúncio: roda a skill `text_review` e grava a sugestão como linha
 * `pending` em `service_text_revisions` (nada é aplicado ao anúncio aqui — a aprovação é humana).
 * Tudo com o JWT do usuário (`db`).
 */

import { aiTable, type AiUserDb } from '../db';
import { runSkill } from '../run-skill';
import { buildServiceContext } from './context';
import { loadReviewPrompt } from './prompt-store';
import { TEXT_REVIEW_SKILL_KEY, type TextReviewInput, type TextReviewOutput } from './skill';
import './skill'; // garante o registerSkill

export interface ReviewServiceOptions {
  runId?: number | string | null;
  userId?: string;
}

export interface ReviewServiceResult {
  serviceId: number;
  /** `true` quando já existia revisão pending e nada foi gerado. */
  skipped: boolean;
  revisionId: number | string | null;
  revised?: string;
  provider?: string;
  model?: string | null;
  tokensIn: number;
  tokensOut: number;
}

export async function hasPendingRevision(db: AiUserDb, serviceId: number): Promise<boolean> {
  const res = await aiTable(
    db,
    `/service_text_revisions?service_id=eq.${serviceId}&field=eq.description&status=eq.pending&select=service_id&limit=1`
  );
  if (!res.ok) throw new Error(`Falha ao consultar revisões (${res.status}).`);
  return ((await res.json()) as unknown[]).length > 0;
}

export async function reviewService(
  db: AiUserDb,
  serviceId: number,
  opts: ReviewServiceOptions = {}
): Promise<ReviewServiceResult> {
  if (await hasPendingRevision(db, serviceId)) {
    return { serviceId, skipped: true, revisionId: null, tokensIn: 0, tokensOut: 0 };
  }

  const context = await buildServiceContext(db, serviceId);
  if (!context.description.trim()) throw new Error(`Serviço ${serviceId} sem descrição.`);
  const prompt = await loadReviewPrompt(db, context.categoryId);

  const { output, provider, model, usage } = await runSkill<TextReviewInput, TextReviewOutput>(
    TEXT_REVIEW_SKILL_KEY,
    { serviceId, context, prompt },
    { userId: opts.userId ?? 'system', tenantId: context.tenantId ?? '', db },
    { provider: prompt.provider, model: prompt.model, temperature: prompt.temperature }
  );

  const tokensIn = usage?.tokensIn ?? 0;
  const tokensOut = usage?.tokensOut ?? 0;

  const res = await aiTable(db, '/service_text_revisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      service_id: serviceId,
      tenant_id: context.tenantId ?? undefined,
      field: 'description',
      original_text: context.description,
      revised_text: output.revised,
      status: 'pending',
      origin: 'ai',
      provider,
      model,
      prompt_version: prompt.version,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      run_id: opts.runId ?? null,
    }),
  });
  // 409: índice único de pending — outro lote gravou a sugestão deste anúncio no meio do caminho.
  if (res.status === 409) {
    return { serviceId, skipped: true, revisionId: null, tokensIn, tokensOut };
  }
  if (!res.ok) throw new Error(`Falha ao gravar revisão (${res.status}).`);
  const rows = (await res.json().catch(() => [])) as Array<{ id?: number | string }>;

  return {
    serviceId,
    skipped: false,
    revisionId: rows[0]?.id ?? null,
    revised: output.revised,
    provider,
    model,
    tokensIn,
    tokensOut,
  };
}
