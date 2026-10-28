// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouteMap } from './route-map';

class RO {
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', RO);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const origin = { lat: -15.62, lng: -56.12 };
const destination = { lat: -15.6, lng: -56.09 };
const path = [origin, { lat: -15.61, lng: -56.1 }, destination];

describe('RouteMap (mantido após extrair o viewport compartilhado)', () => {
  it('enquadra a rota: tiles, linha em SVG e origem/destino', () => {
    const { container } = render(<RouteMap path={path} origin={origin} destination={destination} />);
    expect(screen.getByRole('region', { name: 'Mapa com a rota até o local' })).toBeTruthy();
    expect(container.querySelectorAll('img[src*="tile.openstreetmap.org"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(screen.getByText('© OpenStreetMap')).toBeTruthy();
  });

  it('botões de zoom mexem nos tiles', () => {
    const { container } = render(<RouteMap path={path} origin={origin} destination={destination} />);
    const zoom = () => Number((container.querySelector('img') as HTMLImageElement).src.split('/').slice(-3)[0]);
    const before = zoom();
    fireEvent.click(screen.getByRole('button', { name: 'Afastar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Afastar' }));
    expect(zoom()).toBeLessThan(before);
  });
});
