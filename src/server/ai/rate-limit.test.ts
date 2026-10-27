import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __rateLimitSize, __resetRateLimit, checkRateLimit } from './rate-limit';

beforeEach(() => {
  __resetRateLimit();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('checkRateLimit', () => {
  it('limita por janela e libera depois', () => {
    expect(checkRateLimit('a', 2, 1000)).toBe(true);
    expect(checkRateLimit('a', 2, 1000)).toBe(true);
    expect(checkRateLimit('a', 2, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit('a', 2, 1000)).toBe(true);
  });

  it('poda chaves vencidas quando o mapa passa de 10 mil', () => {
    for (let i = 0; i < 10_001; i++) checkRateLimit(`k${i}`, 5, 1000);
    expect(__rateLimitSize()).toBe(10_001);
    vi.advanceTimersByTime(2000);
    checkRateLimit('novo', 5, 1000);
    expect(__rateLimitSize()).toBe(1);
  });

  it('nunca passa de 50 mil, mesmo com tudo na janela', () => {
    for (let i = 0; i < 50_200; i++) checkRateLimit(`k${i}`, 5, 60_000);
    expect(__rateLimitSize()).toBeLessThanOrEqual(50_000);
    // a chave mais antiga saiu; a mais nova segue contada
    expect(checkRateLimit('k50199', 1, 60_000)).toBe(false);
  });
});
