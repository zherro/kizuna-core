import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClaudeProvider, CLAUDE_DEFAULT_MODEL, toClaudeMessages, toJsonSchema } from './claude';

afterEach(() => vi.unstubAllGlobals());

const req = {
  systemPrompt: 'sys',
  contents: [
    { role: 'user', parts: [{ text: 'a' }] },
    { role: 'user', parts: [{ text: 'b' }] },
    { role: 'model', parts: [{ text: 'c' }] },
    { role: 'user', parts: [{ text: 'd' }] },
  ],
  schema: { type: 'object', properties: { x: { type: 'string', nullable: true } } },
  timeoutMs: 1000,
};

function stub(res: Response) {
  const f = vi.fn(async () => res);
  vi.stubGlobal('fetch', f);
  return f;
}

describe('ClaudeProvider', () => {
  it('envia tool-use forçado com headers corretos e devolve input + usage', async () => {
    const f = stub(
      new Response(
        JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          content: [{ type: 'tool_use', name: 'respond', input: { x: 'ok' } }],
          usage: { input_tokens: 11, output_tokens: 7 },
        })
      )
    );
    const p = new ClaudeProvider({ apiKey: 'k' });
    expect(p.model).toBe(CLAUDE_DEFAULT_MODEL);
    const r = await p.generateStructuredWithUsage(req);
    expect(r.output).toEqual({ x: 'ok' });
    expect(r.usage).toEqual({ tokensIn: 11, tokensOut: 7 });

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const h = init.headers as Record<string, string>;
    expect(h['x-api-key']).toBe('k');
    expect(h['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(String(init.body));
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'respond' });
    expect(body.tools[0].input_schema.properties.x.type).toEqual(['string', 'null']);
    expect(body.messages).toEqual([
      { role: 'user', content: 'a\n\nb' },
      { role: 'assistant', content: 'c' },
      { role: 'user', content: 'd' },
    ]);
    expect(body.system).toBe('sys');
  });

  it('401 → blocked; 529 → transient', async () => {
    stub(new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), { status: 401 }));
    await expect(new ClaudeProvider({ apiKey: 'k' }).generateStructured(req)).rejects.toMatchObject({
      name: 'AiUnavailableError',
      reason: 'blocked',
    });
    stub(new Response(JSON.stringify({ error: { message: 'Overloaded' } }), { status: 529 }));
    await expect(new ClaudeProvider({ apiKey: 'k' }).generateStructured(req)).rejects.toMatchObject({
      reason: 'transient',
    });
  });

  it('sem bloco tool_use → AiUnavailableError', async () => {
    stub(new Response(JSON.stringify({ content: [{ type: 'text', text: 'oi' }] })));
    await expect(new ClaudeProvider({ apiKey: 'k' }).generateStructured(req)).rejects.toMatchObject({
      name: 'AiUnavailableError',
    });
  });

  it('falha de rede → AiUnavailableError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('boom')))
    );
    await expect(new ClaudeProvider({ apiKey: 'k' }).generateStructured(req)).rejects.toMatchObject({
      name: 'AiUnavailableError',
    });
  });
});

describe('helpers', () => {
  it('toClaudeMessages aceita string e garante começar por user', () => {
    expect(toClaudeMessages('oi')).toEqual([{ role: 'user', content: 'oi' }]);
    expect(toClaudeMessages([{ role: 'model', parts: [{ text: 'x' }] }])[0].role).toBe('user');
  });
  it('toJsonSchema minusculiza tipos e trata nullable', () => {
    expect(
      toJsonSchema({ type: 'OBJECT', properties: { a: { type: 'INTEGER', nullable: true } } })
    ).toEqual({
      type: 'object',
      properties: { a: { type: ['integer', 'null'] } },
    });
  });
});
