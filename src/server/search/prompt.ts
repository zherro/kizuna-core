/**
 * System prompt, JSON schema da resposta e montagem do `contents` do Gemini para o `search-agent`.
 */

import type { SearchChatRequest } from '../../client/components/search/search-types';

export function buildSystemPrompt(): string {
  return [
    'Você ajuda o usuário a encontrar SERVIÇOS num marketplace. Sua ÚNICA função é montar um',
    'filtro de busca estruturado. Não recomende prestadores, não invente informação, não fale',
    'sobre preços ou disponibilidade de serviços específicos.',
    '',
    'Regras:',
    '- Faça no máximo 1 ou 2 perguntas curtas. Se já dá para buscar, monte o filtro e responda',
    '  com precisa_mais_info = false.',
    '- Use APENAS groupSlug / categoryId / subcategoryIds que existam na lista fornecida na',
    '  conversa. NUNCA invente id ou slug.',
    '- Se o termo do usuário não bate com nenhuma categoria, use o campo query (texto livre).',
    '- Prefira o filtro mais específico possível: subcategoria > categoria > grupo > texto livre.',
    '- A localização (estado e cidade) já foi definida pelo usuário e NÃO é sua responsabilidade —',
    '  não pergunte nem comente sobre localização.',
    '- Preencha sempre o campo resumo com UMA frase do que você entendeu.',
    '- mensagem_usuario: curta, cordial, em português do Brasil.',
    '- Se o usuário falar de assunto que não é busca de serviço, responda que você só ajuda a',
    '  encontrar serviços e peça o que ele procura.',
    '- filtro pode ser null quando você ainda não tem nada para filtrar (só está perguntando).',
  ].join('\n');
}

export const SEARCH_FILTER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    mensagem_usuario: { type: 'string' },
    resumo: { type: 'string' },
    precisa_mais_info: { type: 'boolean' },
    filtro: {
      type: 'object',
      nullable: true,
      properties: {
        groupSlug: { type: 'string', nullable: true },
        categoryId: { type: 'integer', nullable: true },
        subcategoryIds: { type: 'array', items: { type: 'integer' } },
        query: { type: 'string', nullable: true },
        priceMin: { type: 'number', nullable: true },
        priceMax: { type: 'number', nullable: true },
      },
    },
  },
  required: ['mensagem_usuario', 'resumo', 'precisa_mais_info'],
} as const;

type GeminiContent = { role: 'user' | 'model'; parts: { text: string }[] };

const HISTORY_WINDOW = 6;

/** Monta o array `contents` do Gemini: taxonomia + resumo do histórico antigo + janela recente. */
export function buildContents(req: SearchChatRequest, taxonomyText: string): GeminiContent[] {
  const contents: GeminiContent[] = [
    { role: 'user', parts: [{ text: `Taxonomia disponível:\n${taxonomyText}` }] },
  ];

  const msgs = req.messages;
  const recent = msgs.slice(-HISTORY_WINDOW);
  const older = msgs.slice(0, Math.max(0, msgs.length - HISTORY_WINDOW));

  if (older.length > 0) {
    const resumo = older
      .map((m) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
      .join(' | ')
      .slice(0, 800);
    contents.push({ role: 'user', parts: [{ text: `Contexto anterior resumido: ${resumo}` }] });
  }

  for (const m of recent) {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }

  return contents;
}
