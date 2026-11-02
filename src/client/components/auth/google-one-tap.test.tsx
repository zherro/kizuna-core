// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { GoogleOneTap } from './google-one-tap';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  // Config incompleta: o fluxo para depois do GET, sem carregar o script do Google.
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('GoogleOneTap', () => {
  it('sem interação nunca busca (nem por timer)', async () => {
    render(<GoogleOneTap active />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a 1ª interação dispara na hora e a 2ª não duplica', async () => {
    render(<GoogleOneTap active />);
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event('keydown'));
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('desmontar antes do gatilho não busca nada', async () => {
    const { unmount } = render(<GoogleOneTap active />);
    unmount();
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('active=false nunca busca', async () => {
    render(<GoogleOneTap active={false} />);
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
