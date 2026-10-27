// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DeviceBreakdown } from './device-breakdown';

afterEach(cleanup);

describe('DeviceBreakdown', () => {
  it('mostra título, rótulos em pt-BR, views e percentuais como vieram (sem forçar soma 100)', () => {
    render(
      <DeviceBreakdown
        items={[
          { device: 'mobile', views: 1200, share: 67 },
          { device: 'desktop', views: 400, share: 22 },
          { device: 'tablet', views: 100, share: 6 },
          { device: 'unknown', views: 90, share: 5 },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Dispositivos' })).toBeTruthy();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0].textContent).toContain('Celular');
    expect(items[0].textContent).toContain('1.200');
    expect(items[0].textContent).toContain('67%');
    expect(items[1].textContent).toContain('Computador');
    expect(items[2].textContent).toContain('Tablet');
    expect(items[3].textContent).toContain('Não informado');
    expect(items[3].textContent).toContain('5%');
  });

  it('aparelho desconhecido no rótulo cai no próprio valor', () => {
    render(<DeviceBreakdown items={[{ device: 'tv', views: 3, share: 100 }]} />);
    expect(screen.getByRole('listitem').textContent).toContain('tv');
  });

  it('estado vazio explica que o dado só existe para acessos novos', () => {
    render(<DeviceBreakdown items={[]} />);
    expect(screen.getByRole('heading', { name: 'Dispositivos' })).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText(/acessos novos/i)).toBeTruthy();
  });
});
