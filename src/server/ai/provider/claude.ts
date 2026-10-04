/**
 * `ClaudeProvider` — `AiProvider` sobre a Messages API da Anthropic (fetch cru, sem SDK).
 *
 * Saída estruturada por tool-use forçado: declara uma única tool `respond` cujo `input_schema`
 * é o schema da skill e força `tool_choice: { type: 'tool', name: 'respond' }`. O `input` do
 * bloco `tool_use` devolvido é o objeto estruturado.
 */

import { AiUnavailableError, isRecoverableAiError } from '../errors';
import type { AiProvider, AiStructuredRequest, AiStructuredResult } from './types';

export const CLAUDE_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const TOOL_NAME = 'respond';

type ClaudeMessage = { role: 'user' | 'assistant'; content: string };

/** Converte `contents` (formato Gemini ou string/mensagens simples) em mensagens da Anthropic. */
export function toClaudeMessages(contents: unknown): ClaudeMessage[] {
  const out: ClaudeMessage[] = [];
  const push = (role: 'user' | 'assistant', text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += `\n\n${text}`;
    else out.push({ role, content: text });
  };

  if (typeof contents === 'string') push('user', contents);
  else if (Array.isArray(contents)) {
    for (const c of contents as Array<Record<string, unknown>>) {
      const role = c?.role === 'model' || c?.role === 'assistant' ? 'assistant' : 'user';
      let text = '';
      if (Array.isArray(c?.parts)) {
        text = (c.parts as Array<{ text?: unknown }>).map((p) => String(p?.text ?? '')).join('');
      } else if (typeof c?.content === 'string') text = c.content;
      push(role, text.trim());
    }
  }
  if (out.length === 0 || out[0].role !== 'user') out.unshift({ role: 'user', content: '(início)' });
  return out;
}

/** Schema estilo Gemini/OpenAPI → JSON Schema (`nullable`, tipos em maiúsculas). */
export function toJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const src = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k === 'nullable') continue;
    if (k === 'type' && typeof v === 'string') out[k] = v.toLowerCase();
    else out[k] = toJsonSchema(v);
  }
  if (src.nullable === true && typeof out.type === 'string') out.type = [out.type, 'null'];
  return out;
}

export class ClaudeProvider implements AiProvider {
  readonly id = 'claude' as const;
  readonly model: string;

  constructor(private readonly opts: { apiKey: string; model?: string; maxTokens?: number }) {
    this.model = opts.model || CLAUDE_DEFAULT_MODEL;
  }

  async generateStructured(req: AiStructuredRequest): Promise<Record<string, unknown>> {
    return (await this.generateStructuredWithUsage(req)).output;
  }

  async generateStructuredWithUsage(req: AiStructuredRequest): Promise<AiStructuredResult> {
    const { apiKey } = this.opts;
    const schema = toJsonSchema(req.schema);
    const inputSchema =
      schema && typeof schema === 'object' && (schema as { type?: unknown }).type === 'object'
        ? schema
        : { type: 'object', properties: {} };

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(req.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.opts.maxTokens ?? 4096,
          temperature: req.temperature ?? 0.2,
          system: req.systemPrompt,
          messages: toClaudeMessages(req.contents),
          tools: [
            {
              name: TOOL_NAME,
              description: 'Devolve a resposta estruturada no formato exigido.',
              input_schema: inputSchema,
            },
          ],
          tool_choice: { type: 'tool', name: TOOL_NAME },
        }),
      });
    } catch (cause) {
      throw new AiUnavailableError('Falha ao chamar o Claude (timeout ou rede).', { cause });
    }

    const data = (await res.json().catch(() => null)) as {
      content?: Array<{ type?: string; name?: string; input?: unknown }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
      error?: { type?: string; message?: string };
    } | null;

    if (!res.ok) {
      const message = data?.error?.message ?? `Claude respondeu ${res.status}.`;
      if (res.status === 401 || res.status === 403) {
        throw new AiUnavailableError(message, { reason: 'blocked' });
      }
      if (res.status === 429 || res.status === 529 || res.status >= 500) {
        throw new AiUnavailableError(message, { reason: 'transient' });
      }
      if (isRecoverableAiError(new Error(message))) throw new AiUnavailableError(message);
      throw new Error(message);
    }

    const block = data?.content?.find((b) => b?.type === 'tool_use' && b.name === TOOL_NAME);
    const input = block?.input;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new AiUnavailableError('Resposta da IA em formato inesperado.');
    }

    const usage = data?.usage
      ? {
          tokensIn: Number(data.usage.input_tokens ?? 0) || 0,
          tokensOut: Number(data.usage.output_tokens ?? 0) || 0,
        }
      : undefined;

    return { output: input as Record<string, unknown>, usage, model: data?.model || this.model };
  }
}
