// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../../hooks/use-current-position', () => ({
  useCurrentPosition: () => ({ status: 'idle', position: null, request: vi.fn() }),
}));

import { ServiceLocationSection } from './service-location-section';

beforeEach(() => {
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

describe('ServiceLocationSection', () => {
  it('com coordenadas mostra mapa e card de como chegar', () => {
    render(
      <ServiceLocationSection
        location={{ address: 'Rua X, 100', lat: -15.6, lng: -56.1, label: null }}
        title="Barbearia"
        hue={200}
      />
    );
    expect(screen.getByText('Localização')).toBeTruthy();
    expect(screen.getByText('Ver mapa maior (OpenStreetMap)')).toBeTruthy();
    expect(screen.getByText('Rua X, 100')).toBeTruthy();
  });

  it('sem coordenadas mostra só o endereço (sem mapa)', () => {
    render(
      <ServiceLocationSection
        location={{ address: 'Rua X, 100', lat: null, lng: null, label: null }}
        title="Barbearia"
        hue={200}
      />
    );
    expect(screen.getByText('Rua X, 100')).toBeTruthy();
    expect(screen.queryByText('Ver mapa maior (OpenStreetMap)')).toBeNull();
  });

  it('location nulo não renderiza nada', () => {
    const { container } = render(<ServiceLocationSection location={null} title="Barbearia" hue={200} />);
    expect(container.innerHTML).toBe('');
  });
});
