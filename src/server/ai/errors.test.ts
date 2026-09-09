import { describe, expect, it } from 'vitest';
import { classifyAiError, isRecoverableAiError, AiUnavailableError } from './errors';

describe('classifyAiError', () => {
  it('quota → blocked', () => expect(classifyAiError('quota exceeded')).toBe('blocked'));
  it('timeout → transient', () => expect(classifyAiError('connection timeout')).toBe('transient'));
  it('modelo removido → blocked', () => expect(classifyAiError('model no longer available')).toBe('blocked'));
});
describe('isRecoverableAiError', () => {
  it('503 é recuperável', () => expect(isRecoverableAiError(new Error('503 overloaded'))).toBe(true));
});
describe('AiUnavailableError', () => {
  it('deriva reason da mensagem quando não passado', () =>
    expect(new AiUnavailableError('429 rate limit').reason).toBe('blocked'));
});
