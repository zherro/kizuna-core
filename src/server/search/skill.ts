/**
 * `searchSkill` — o antigo `search-agent` empacotado como `AiSkill` do mecanismo
 * `@kizuna/core/server/ai`. Transforma a conversa da `/busca` num filtro estruturado.
 *
 * As peças continuam em `../search-agent/{prompt,taxonomy}.ts`; aqui só montamos o
 * contrato `AiSkill` na mesma ordem que o `runSearchAgent` original executava.
 */

import type { AiSkill } from '../ai';
import type {
  AgentFilter,
  SearchChatRequest,
  SearchChatResponse,
} from '../../client/components/search/search-types';
import {
  formatTaxonomyForPrompt,
  loadTaxonomySnapshot,
  validateAgentFilter,
} from './taxonomy';
import {
  buildContents,
  buildSystemPrompt,
  SEARCH_FILTER_RESPONSE_SCHEMA,
} from './prompt';

type Loaded = Awaited<ReturnType<typeof loadTaxonomySnapshot>>;

export const searchSkill: AiSkill<SearchChatRequest, Loaded, SearchChatResponse> = {
  key: 'search',
  context: 'search',

  loadContext: () => loadTaxonomySnapshot(),

  buildPrompt: (input, loaded) => {
    const stageCategoryId = input.filtrosAtuais?.categoryId ?? null;
    const taxonomyText = formatTaxonomyForPrompt(loaded, { categoryId: stageCategoryId });
    return { systemPrompt: buildSystemPrompt(), contents: buildContents(input, taxonomyText) };
  },

  schema: SEARCH_FILTER_RESPONSE_SCHEMA,

  validate: (raw, loaded): SearchChatResponse => {
    const parsed = raw as Partial<SearchChatResponse> & { filtro?: unknown };
    const filtro =
      parsed.filtro && typeof parsed.filtro === 'object'
        ? validateAgentFilter(parsed.filtro as AgentFilter, loaded)
        : null;

    return {
      mensagem_usuario: String(parsed.mensagem_usuario ?? '').trim() || 'Certo!',
      resumo: String(parsed.resumo ?? '').trim(),
      precisa_mais_info: Boolean(parsed.precisa_mais_info),
      filtro,
    };
  },
};
