// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCurrentPosition } from './use-current-position';

type Success = (p: GeolocationPosition) => void;
type Failure = (e: GeolocationPositionError) => void;

function stubGeolocation(getCurrentPosition: (ok: Success, fail: Failure) => void) {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: { getCurrentPosition: vi.fn(getCurrentPosition) },
    configurable: true,
  });
  return (globalThis.navigator.geolocation as unknown as { getCurrentPosition: ReturnType<typeof vi.fn> })
    .getCurrentPosition;
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis.navigator, 'geolocation');
});

describe('useCurrentPosition', () => {
  it('começa em idle e NÃO pede a posição ao montar', () => {
    const spy = stubGeolocation(() => {});
    const { result } = renderHook(() => useCurrentPosition());
    expect(result.current.status).toBe('idle');
    expect(result.current.position).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('request() com permissão vira granted com as coordenadas', () => {
    stubGeolocation((ok) =>
      ok({ coords: { latitude: -15.6, longitude: -56.1, accuracy: 30 } } as GeolocationPosition)
    );
    const { result } = renderHook(() => useCurrentPosition());
    act(() => result.current.request());
    expect(result.current.status).toBe('granted');
    expect(result.current.position).toEqual({ lat: -15.6, lng: -56.1, accuracy: 30 });
  });

  it('permissão negada (código 1) vira denied', () => {
    stubGeolocation((_ok, fail) => fail({ code: 1 } as GeolocationPositionError));
    const { result } = renderHook(() => useCurrentPosition());
    act(() => result.current.request());
    expect(result.current.status).toBe('denied');
    expect(result.current.position).toBeNull();
  });

  it('falha de posição ou timeout (códigos 2 e 3) vira unavailable', () => {
    stubGeolocation((_ok, fail) => fail({ code: 3 } as GeolocationPositionError));
    const { result } = renderHook(() => useCurrentPosition());
    act(() => result.current.request());
    expect(result.current.status).toBe('unavailable');
  });

  it('sem navigator.geolocation vira unavailable', () => {
    const { result } = renderHook(() => useCurrentPosition());
    act(() => result.current.request());
    expect(result.current.status).toBe('unavailable');
  });

  it('getCurrentPosition que lança de forma síncrona vira unavailable', () => {
    stubGeolocation(() => {
      throw new Error('SecurityError');
    });
    const { result } = renderHook(() => useCurrentPosition());
    act(() => result.current.request());
    expect(result.current.status).toBe('unavailable');
    expect(result.current.position).toBeNull();
  });

  it('nunca grava a posição em localStorage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    stubGeolocation((ok) =>
      ok({ coords: { latitude: 1, longitude: 2, accuracy: null } } as unknown as GeolocationPosition)
    );
    const { result } = renderHook(() => useCurrentPosition());
    act(() => result.current.request());
    expect(result.current.status).toBe('granted');
    expect(setItem).not.toHaveBeenCalled();
  });
});
