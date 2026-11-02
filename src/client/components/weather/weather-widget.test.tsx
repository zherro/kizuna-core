// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { WeatherWidget } from './weather-widget';

vi.mock('../../hooks/use-user-location', () => ({ useUserLocation: () => ({ location: null }) }));
vi.mock('../viewing-city', () => ({ useViewingCity: () => null }));

const fetchMock = vi.fn();

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ cities: [], today: '2026-01-01' }) });
  vi.stubGlobal('fetch', fetchMock);
  // Sem requestIdleCallback no jsdom: cai no setTimeout de 1500 ms.
  vi.stubGlobal('requestIdleCallback', undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('WeatherWidget', () => {
  it('não busca antes do idle e busca depois', async () => {
    render(<WeatherWidget />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1499);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('desmontar cancela a busca', async () => {
    const { unmount } = render(<WeatherWidget />);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('minWidth com matchMedia falso não busca', async () => {
    stubMatchMedia(false);
    render(<WeatherWidget minWidth={768} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('minWidth com matchMedia verdadeiro busca', async () => {
    stubMatchMedia(true);
    render(<WeatherWidget minWidth={768} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
