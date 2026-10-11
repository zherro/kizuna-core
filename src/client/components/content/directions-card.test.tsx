// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const hook = vi.hoisted(() => ({
  state: { status: 'idle', position: null as { lat: number; lng: number; accuracy: number | null } | null },
  request: vi.fn(),
}));

vi.mock('../../hooks/use-current-position', () => ({
  useCurrentPosition: () => ({ status: hook.state.status, position: hook.state.position, request: hook.request }),
}));

import { DirectionsCard, LocationMap } from './index';

beforeEach(() => {
  hook.state = { status: 'idle', position: null };
  hook.request.mockClear();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const DEST = { lat: -15.601, lng: -56.097 };

describe('DirectionsCard', () => {
  it('mostra os botões de rota com o destino', () => {
    render(<DirectionsCard destination={DEST} address="Av. X, 100" />);
    const google = screen.getByRole('link', { name: /Google Maps/ });
    expect(google.getAttribute('href')).toContain('destination=-15.601%2C-56.097');
    expect(google.getAttribute('href')).not.toContain('origin=');
    expect(screen.getByRole('link', { name: /Waze/ }).getAttribute('href')).toContain('waze.com/ul');
  });

  it('NÃO pede a localização ao montar; pede ao clicar', () => {
    render(<DirectionsCard destination={DEST} />);
    expect(hook.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /a partir de você/i }));
    expect(hook.request).toHaveBeenCalledTimes(1);
  });

  it('o botão de convite ocupa a largura do cartão (não quebra em órfã dentro da pílula)', () => {
    render(<DirectionsCard destination={DEST} />);
    const cls = screen.getByRole('button', { name: /a partir de você/i }).className;
    expect(cls).toContain('w-full');
    expect(cls).toContain('text-balance');
  });

  it('com posição concedida mostra a distância em linha reta e põe a origem no Google', () => {
    hook.state = { status: 'granted', position: { lat: -15.646, lng: -56.132, accuracy: 20 } };
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<DirectionsCard destination={DEST} />);
    expect(setItem).not.toHaveBeenCalled();
    expect(screen.getByText(/em linha reta/)).toBeTruthy();
    expect(screen.getByText(/km/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Google Maps/ }).getAttribute('href')).toContain('origin=');
  });

  it('negado: avisa e mantém os botões de destino', () => {
    hook.state = { status: 'denied', position: null };
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<DirectionsCard destination={DEST} />);
    expect(screen.getByText(/sem acesso à sua localização/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Waze/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /a partir de você/i })).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('indisponível: avisa e mantém o botão para tentar de novo', () => {
    hook.state = { status: 'unavailable', position: null };
    render(<DirectionsCard destination={DEST} />);
    expect(screen.getByText(/não foi possível obter sua localização/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /a partir de você/i })).toBeTruthy();
  });

  it('durante a busca, o botão continua montado (foco preservado), desabilitado e ocupado', () => {
    hook.state = { status: 'asking', position: null };
    render(<DirectionsCard destination={DEST} />);
    const button = screen.getByRole('button', { name: /a partir de você/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText(/Buscando sua localização/)).toBeTruthy();
    fireEvent.click(button);
    expect(hook.request).not.toHaveBeenCalled();
  });

  it('em idle o botão está habilitado e sem aria-busy', () => {
    render(<DirectionsCard destination={DEST} />);
    const button = screen.getByRole('button', { name: /a partir de você/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(screen.queryByText(/Buscando sua localização/)).toBeNull();
  });

  it('com posição concedida o convite some', () => {
    hook.state = { status: 'granted', position: { lat: -15.646, lng: -56.132, accuracy: 20 } };
    render(<DirectionsCard destination={DEST} />);
    expect(screen.queryByRole('button', { name: /a partir de você/i })).toBeNull();
  });

  it('o aviso antes do consentimento diz que o Google Maps recebe a posição', () => {
    render(<DirectionsCard destination={DEST} />);
    expect(screen.getByText(/Google Maps, ele recebe sua posição/)).toBeTruthy();
  });

  it('só com endereço (sem coordenadas) não oferece distância, mas oferece rota', () => {
    render(<DirectionsCard address="Av. X, 100" />);
    expect(screen.queryByRole('button', { name: /a partir de você/i })).toBeNull();
    expect(screen.getByRole('link', { name: /Google Maps/ }).getAttribute('href')).toContain(
      'destination=Av.%20X%2C%20100'
    );
  });

  it('mostra as dicas de chegada', () => {
    render(<DirectionsCard address="Av. X" tips="Estacionamento na rua lateral." />);
    expect(screen.getByText('Estacionamento na rua lateral.')).toBeTruthy();
  });

  it('sem destino, endereço nem dicas não renderiza nada', () => {
    const { container } = render(<DirectionsCard />);
    expect(container.innerHTML).toBe('');
  });
});

describe('LocationMap', () => {
  it('mantém o link para o mapa maior e o título acessível, sem carregar o iframe antes de visível', () => {
    const { container } = render(<LocationMap lat={-15.6} lng={-56.1} title="Lua Morena" />);
    const link = screen.getByRole('link', { name: /mapa maior/i });
    expect(link.getAttribute('href')).toContain('openstreetmap.org/?mlat=-15.6');
    expect(container.querySelector('iframe')).toBeNull();
  });
});
