// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAiDegradation } from './use-ai-degradation';

afterEach(() => cleanup());

describe('useAiDegradation', () => {
  it('blocked na 1ª vira unavailable', () => {
    const { result } = renderHook(() => useAiDegradation('x'));
    act(() => result.current.report(new Error('quota exceeded')));
    expect(result.current.status).toBe('unavailable');
  });

  it('5 transients viram unavailable; antes é degraded', () => {
    const { result } = renderHook(() => useAiDegradation('x'));
    for (let i = 0; i < 4; i++) {
      act(() => result.current.report(new Error('connection timeout')));
    }
    expect(result.current.status).toBe('degraded');
    act(() => result.current.report(new Error('connection timeout')));
    expect(result.current.status).toBe('unavailable');
  });

  it('retry limpa degraded', () => {
    const { result } = renderHook(() => useAiDegradation('x'));
    act(() => result.current.report(new Error('connection timeout')));
    expect(result.current.status).toBe('degraded');
    act(() => result.current.retry());
    expect(result.current.status).toBe('ready');
  });
});
