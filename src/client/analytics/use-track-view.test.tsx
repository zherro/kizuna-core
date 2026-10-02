// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrackView } from './use-track-view';

const ID = '0b1d5a1e-7c3e-4a9a-9d0e-2f5f6a7b8c9d';
const rule = { minVisibleMs: 1500, minVisibleRatio: 0.5, oncePerSession: true };

let ioCallback: IntersectionObserverCallback = () => {};
class FakeIO {
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
const setInView = (isIntersecting: boolean) =>
  act(() => ioCallback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));

const fetchMock = vi.fn();

function mount(over: Partial<Parameters<typeof useTrackView>[0]> = {}) {
  const hook = renderHook(() =>
    useTrackView({ entityType: 'service', entityId: ID, event: 'view', rule, source: 'search', ...over })
  );
  act(() => hook.result.current(document.createElement('div')));
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('IntersectionObserver', FakeIO);
  vi.stubGlobal('navigator', { webdriver: false, userAgent: 'Mozilla/5.0 Chrome/126' });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useTrackView', () => {
  it('envia só depois de minVisibleMs contínuos em tela', () => {
    mount();
    setInView(true);
    act(() => vi.advanceTimersByTime(1499));
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body).toMatchObject({
      p_entity_type: 'service',
      p_entity_id: ID,
      p_event_type: 'view',
      p_source: 'search',
    });
    expect(body.p_visible_ms).toBeGreaterThanOrEqual(1500);
  });

  it('congela o cronômetro fora da tela e retoma de onde parou', () => {
    mount();
    setInView(true);
    act(() => vi.advanceTimersByTime(1000));
    setInView(false);
    act(() => vi.advanceTimersByTime(10_000));
    expect(fetchMock).not.toHaveBeenCalled();
    setInView(true);
    act(() => vi.advanceTimersByTime(499));
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('não repete na mesma sessão quando oncePerSession', () => {
    mount();
    setInView(true);
    act(() => vi.advanceTimersByTime(1500));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    mount();
    setInView(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sem regra (evento desligado) não observa nada', () => {
    mount({ rule: null });
    setInView(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
