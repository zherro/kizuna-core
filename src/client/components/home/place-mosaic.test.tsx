// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PlaceMosaic } from './place-mosaic';
import type { PlaceHighlightItem } from './place-highlights';

const item = (n: number, extra: Partial<PlaceHighlightItem> = {}): PlaceHighlightItem => ({
  href: `/lugares/lugar-${n}`,
  title: `Lugar ${n}`,
  kicker: n % 2 ? 'Shopping' : 'Casa de festas',
  ...extra,
});
const items = [1, 2, 3, 4, 5, 6].map((n) => item(n, n === 1 ? { summary: 'Resumo 1', image: '/a.jpg', meta: 'Rua X' } : {}));

afterEach(cleanup);

describe('PlaceMosaic', () => {
  it('sem itens não renderiza nada', () => {
    const { container } = render(<PlaceMosaic items={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it.each(['bento', 'columns', 'strips'] as const)('variante %s: um link por card e foto lazy', (variant) => {
    const { container } = render(<PlaceMosaic items={items} variant={variant} moreHref="/lugares" />);
    expect(container.querySelector('section[aria-labelledby]')).not.toBeNull();
    const cards = container.querySelectorAll('li');
    expect(cards).toHaveLength(6);
    cards.forEach((li) => expect(li.querySelectorAll('a')).toHaveLength(1));
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(screen.getByText('Ver todos').getAttribute('href')).toBe('/lugares');
  });

  it('sem foto usa o gradiente do grupo', () => {
    const { container } = render(<PlaceMosaic items={[item(1)]} variant="bento" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).toContain('linear-gradient(150deg');
  });

  it('respeita limit e labels', () => {
    const { container } = render(
      <PlaceMosaic items={items} variant="bento" limit={3} labels={{ all: 'All', surprise: 'Surprise me' }} />
    );
    expect(container.querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Surprise me/ })).toBeTruthy();
  });

  it('chips filtram por grupo e "Todos" restaura', () => {
    const { container } = render(<PlaceMosaic items={items} variant="columns" />);
    fireEvent.click(screen.getByRole('button', { name: 'Casa de festas' }));
    expect(container.querySelectorAll('li')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Casa de festas' }).getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).not.toContain('Lugar 1');
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(container.querySelectorAll('li')).toHaveLength(6);
  });

  it('um só grupo não mostra chips', () => {
    render(<PlaceMosaic items={[item(1), item(3)]} />);
    expect(screen.queryByRole('button', { name: 'Todos' })).toBeNull();
  });

  it('Surpreenda-me destaca um lugar do filtro atual e oferece o link', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { container } = render(<PlaceMosaic items={items} variant="bento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Casa de festas' }));
    fireEvent.click(screen.getByRole('button', { name: /Surpreenda-me/ }));
    const status = screen.getByRole('status');
    expect(within(status).getByText('Lugar 2')).toBeTruthy();
    expect(within(status).getByRole('link').getAttribute('href')).toBe('/lugares/lugar-2');
    expect(container.querySelectorAll('li a')[0].className).toContain('ring-4');
    fireEvent.click(within(status).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('status')).toBeNull();
    vi.restoreAllMocks();
  });
});
