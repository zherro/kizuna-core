export interface AiStructuredRequest {
    systemPrompt: string;
    contents: unknown;
    schema: unknown;
    timeoutMs: number;
    temperature?: number;
}
export interface AiProvider {
    readonly id: 'gemini' | 'openai' | 'claude';
    generateStructured(req: AiStructuredRequest): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=types.d.ts.map