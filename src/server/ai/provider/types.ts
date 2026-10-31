export interface AiStructuredRequest {
  systemPrompt: string;
  contents: unknown; // Gemini "contents" shape for v1; normalized when a 2nd provider is added
  schema: unknown; // JSON schema (Gemini responseSchema)
  timeoutMs: number;
  temperature?: number;
}

export interface AiProvider {
  readonly id: 'gemini' | 'openai' | 'claude';
  generateStructured(req: AiStructuredRequest): Promise<Record<string, unknown>>;
}
