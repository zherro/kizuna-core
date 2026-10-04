/**
 * Prompt da revisão de texto: carrega `service_description_review` de `public.ai_prompts`
 * (override por categoria, senão o global) com cache curto e fallback para o prompt embutido.
 */

import { aiTable, type AiUserDb } from '../db';

export const REVIEW_PROMPT_KEY = 'service_description_review';

export interface ReviewPrompt {
  systemPrompt: string;
  userTemplate: string;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  /** 0 = prompt embutido (sem linha no banco). */
  version: number;
  categoryId: number | null;
  source: 'db' | 'default';
}

export const DEFAULT_REVIEW_SYSTEM_PROMPT = [
  'Você é um revisor de textos de anúncios de um marketplace de serviços em português do Brasil.',
  'Sua tarefa é revisar a DESCRIÇÃO de um anúncio: corrigir ortografia, gramática e pontuação, melhorar clareza, fluidez e organização, mantendo o tom profissional e acolhedor.',
  'Regras obrigatórias:',
  '- NUNCA invente fatos, preços, telefones, endereços, prazos, garantias ou qualquer informação que não esteja no texto original ou nos dados do contexto.',
  '- Preserve todos os dados concretos do original (valores, contatos, horários, nomes, localidades).',
  '- Não use superlativos exagerados nem promessas que o original não faz.',
  '- Mantenha o tamanho semelhante ao original (pode organizar em parágrafos e listas curtas).',
  '- Formato de saída: HTML simples usando somente as tags p, strong, em, ul, ol, li, br e a. Sem títulos, sem estilos, sem scripts.',
  '- Responda exclusivamente pelo campo estruturado solicitado.',
].join('\n');

export const DEFAULT_REVIEW_USER_TEMPLATE = [
  'Categoria: {{category}}',
  'Grupo: {{group}}',
  'Subcategorias: {{subcategories}}',
  'Título do anúncio: {{title}}',
  '',
  'Informações adicionais preenchidas pelo anunciante:',
  '{{fields}}',
  '',
  'Descrição original a revisar:',
  '{{original}}',
].join('\n');

export function defaultReviewPrompt(): ReviewPrompt {
  return {
    systemPrompt: DEFAULT_REVIEW_SYSTEM_PROMPT,
    userTemplate: DEFAULT_REVIEW_USER_TEMPLATE,
    provider: null,
    model: null,
    temperature: null,
    version: 0,
    categoryId: null,
    source: 'default',
  };
}

/** Substitui `{{chave}}`; chaves ausentes viram string vazia. Não reavalia o valor inserido. */
export function renderTemplate(template: string, vars: Record<string, string | null | undefined>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name: string) =>
    String(vars[name] ?? '')
  );
}

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; value: ReviewPrompt }>();

export function clearReviewPromptCache() {
  cache.clear();
}

type PromptRow = {
  system_prompt?: string | null;
  user_template?: string | null;
  provider?: string | null;
  model?: string | null;
  temperature?: number | string | null;
  version?: number | null;
  category_id?: number | null;
};

export function pickPromptRow(rows: PromptRow[], categoryId: number | null): PromptRow | null {
  if (categoryId != null) {
    const specific = rows.find((r) => Number(r.category_id) === categoryId);
    if (specific) return specific;
  }
  return rows.find((r) => r.category_id == null) ?? null;
}

export async function loadReviewPrompt(
  db: AiUserDb | null,
  categoryId: number | null = null
): Promise<ReviewPrompt> {
  const cacheKey = String(categoryId ?? 'global');
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value = defaultReviewPrompt();
  if (db) {
    try {
      const scope =
        categoryId != null ? `&or=(category_id.is.null,category_id.eq.${categoryId})` : '&category_id=is.null';
      const res = await aiTable(
        db,
        `/ai_prompts?key=eq.${REVIEW_PROMPT_KEY}&active=eq.true${scope}` +
          `&select=system_prompt,user_template,provider,model,temperature,version,category_id`
      );
      if (res.ok) {
        const row = pickPromptRow((await res.json()) as PromptRow[], categoryId);
        if (row && (row.system_prompt || row.user_template)) {
          const temp = row.temperature == null ? null : Number(row.temperature);
          value = {
            systemPrompt: row.system_prompt?.trim() || DEFAULT_REVIEW_SYSTEM_PROMPT,
            userTemplate: row.user_template?.trim() || DEFAULT_REVIEW_USER_TEMPLATE,
            provider: row.provider?.trim() || null,
            model: row.model?.trim() || null,
            temperature: temp != null && Number.isFinite(temp) ? temp : null,
            version: Number(row.version ?? 1) || 1,
            categoryId: row.category_id != null ? Number(row.category_id) : null,
            source: 'db',
          };
        }
      }
    } catch {
      // cai no prompt embutido
    }
  }

  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}
