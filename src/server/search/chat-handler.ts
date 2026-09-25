import { AiUnavailableError, registerSkill, runSkill } from '../ai';
import { checkRateLimit } from '../ai/rate-limit';
import type {
  SearchChatMessage,
  SearchChatRequest,
  SearchChatResponse,
} from '../../client/components/search/search-types';
import { searchSkill } from './skill';

const RATE_WINDOW_MS = 5 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseMessages(value: unknown): SearchChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const out: SearchChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    out.push({ role, content });
  }
  return out;
}

/**
 * Handler do `POST /api/ai/search-chat` (rota gerenciada do plugin `search`): conversa → filtro
 * estruturado via a skill `search` do mecanismo `ai`. Busca pública — sem sessão obrigatória, por
 * isso o rate limit por IP (`SEARCH_CHAT_RATE_LIMIT` msgs/5 min, padrão 20). IA indisponível → 503
 * com `fallback: 'text'` (o cliente degrada pra busca por texto).
 */
export async function handleSearchChat(request: Request): Promise<Response> {
  registerSkill(searchSkill); // idempotente (Map.set)

  const body =
    ((await request.json().catch(() => null)) as Partial<SearchChatRequest> | null) ?? {};

  const messages = parseMessages(body.messages);
  const state = String(body.location?.state ?? '').trim();
  if (!messages || !state) return json({ message: 'Requisição inválida.' }, 400);

  const key =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anon';
  const max = Number(process.env.SEARCH_CHAT_RATE_LIMIT ?? 20) || 20;
  if (!checkRateLimit(`search-chat:${key}`, max, RATE_WINDOW_MS)) {
    return json(
      { message: 'Muitas mensagens em pouco tempo. Aguarde um momento e tente de novo.' },
      429
    );
  }

  const payload: SearchChatRequest = {
    messages,
    location: {
      state,
      cityId:
        typeof body.location?.cityId === 'number' && body.location.cityId > 0
          ? body.location.cityId
          : null,
      cityName: body.location?.cityName ? String(body.location.cityName) : null,
    },
    filtrosAtuais: body.filtrosAtuais ?? {},
  };

  try {
    const { output } = await runSkill<SearchChatRequest, SearchChatResponse>('search', payload, {
      userId: 'anon', // busca pública — sem sessão obrigatória
      tenantId: '',
    });
    return json(output);
  } catch (error) {
    if (error instanceof AiUnavailableError || (error as Error)?.name === 'AiUnavailableError') {
      console.warn('[search-chat] IA indisponível:', (error as Error)?.message);
      return json(
        {
          message: 'O assistente está indisponível agora.',
          fallback: 'text',
          reason: (error as AiUnavailableError).reason,
        },
        503
      );
    }
    console.error('[search-chat] erro inesperado:', error);
    const message =
      error instanceof Error ? error.message : 'Não foi possível processar a mensagem.';
    return json({ message }, 500);
  }
}
