export interface AiStructuredRequest {
  systemPrompt: string;
  contents: unknown; // Gemini "contents" shape ({role, parts:[{text}]}[]); o Claude converte
  schema: unknown; // JSON schema (Gemini responseSchema / input_schema do tool no Claude)
  timeoutMs: number;
  temperature?: number;
}

export interface AiUsage {
  tokensIn: number;
  tokensOut: number;
}

export interface AiStructuredResult {
  output: Record<string, unknown>;
  usage?: AiUsage;
  model?: string;
}

export interface AiProvider {
  readonly id: 'gemini' | 'openai' | 'claude';
  /** Modelo efetivo (quando conhecido) — gravado em revisões/auditoria. */
  readonly model?: string;
  generateStructured(req: AiStructuredRequest): Promise<Record<string, unknown>>;
  /** Igual a `generateStructured`, mas devolve também o consumo de tokens quando disponível. */
  generateStructuredWithUsage?(req: AiStructuredRequest): Promise<AiStructuredResult>;
}
