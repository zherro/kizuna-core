// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, dbToday } from '../../../../shared/marketing/cost';
import { StopButton } from './period-fields';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StopButton', () => {
  const today = dbToday();
  const period = { startsOn: today, endsOn: addDays(today, 6) }; // 7 dias, hoje já pago

  it('pede confirmação e mostra quanto volta ao saldo', () => {
    render(<StopButton resource="boosts" id="1" dailyCents={1000} period={period} onStopped={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Parar' }));
    expect(screen.getByText(/60,00/)).toBeTruthy(); // 6 dias não usados × R$ 10,00
    expect(screen.getByText(/Não dá para retomar/)).toBeTruthy();
  });

  it('confirmar manda só stoppedOn = amanhã', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ item: {} }) });
    vi.stubGlobal('fetch', f);
    const onStopped = vi.fn();
    render(<StopButton resource="ad_campaigns" id="9" dailyCents={1000} period={period} onStopped={onStopped} />);
    fireEvent.click(screen.getByRole('button', { name: 'Parar' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/resources/ad_campaigns/9');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ stoppedOn: addDays(today, 1) });
    expect(onStopped).toHaveBeenCalled();
  });

  it('não oferece parar o que já terminou ou foi parado', () => {
    const { container } = render(
      <StopButton resource="boosts" id="1" dailyCents={1000} period={{ startsOn: '2020-01-01', endsOn: '2020-01-07' }} onStopped={() => {}} />,
    );
    expect(container.textContent).toBe('');
  });
});
