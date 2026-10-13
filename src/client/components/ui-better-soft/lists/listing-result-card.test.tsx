// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ListingResultCard } from './listing-result-card';

vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));

afterEach(cleanup);
const base = { href: '/a', title: 'Corte', priceLabel: 'R$ 10' };

describe('ListingResultCard locationLabel', () => {
  it.each(['grid', 'strip'] as const)('mostra o local (%s)', (variant) => {
    render(<ListingResultCard {...base} variant={variant} locationLabel="Cuiabá +2" />);
    expect(screen.getByText('Cuiabá +2')).toBeTruthy();
  });
  it('sem locationLabel nada é renderizado', () => {
    render(<ListingResultCard {...base} />);
    expect(screen.queryByText(/Cuiabá/)).toBeNull();
  });
});

describe('ListingResultCard cardStyle="evento"', () => {
  const evento = {
    ...base,
    cardStyle: 'evento' as const,
    priceLabel: 'R$ 40,00',
    priceCaption: 'A partir de',
    dateLabel: { day: '14', month: 'nov' },
    whenLabel: 'sáb., 14 de nov. · 20:00',
    locationLabel: 'Arena Pantanal',
    ctaLabel: 'Ver evento',
    rating: 4.5,
    reviewCount: 3,
  };

  it.each(['grid', 'strip'] as const)('mostra data e local, sem preço (%s)', (variant) => {
    render(<ListingResultCard {...evento} variant={variant} />);
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('nov')).toBeTruthy();
    expect(screen.getByText(/14 de nov./)).toBeTruthy();
    expect(screen.queryByText('R$ 40,00')).toBeNull();
    expect(screen.queryByText('A partir de')).toBeNull();
  });

  it('grid: local, CTA do evento e sem nota', () => {
    render(<ListingResultCard {...evento} />);
    expect(screen.getByText('Arena Pantanal')).toBeTruthy();
    expect(screen.getByText('Ver evento')).toBeTruthy();
    expect(screen.queryByText('4,5')).toBeNull();
    expect(screen.queryByText('Novo')).toBeNull();
  });

  it.each(['grid', 'strip'] as const)('capa no mesmo modelo do cinema: inteira (%s)', (variant) => {
    const props = { imageUrl: '/c.jpg', title: 'T' };
    const { container: ev } = render(<ListingResultCard {...evento} {...props} variant={variant} />);
    const evClass = ev.querySelector('img')?.className;
    cleanup();
    const { container: ci } = render(
      <ListingResultCard {...base} {...props} cardStyle="cinema" variant={variant} />
    );
    expect(evClass).toContain('object-contain');
    expect(evClass).toBe(ci.querySelector('img')?.className);
  });

  it('sem dateLabel não renderiza bloco de data', () => {
    render(<ListingResultCard {...evento} dateLabel={null} whenLabel={null} />);
    expect(screen.queryByText('nov')).toBeNull();
  });

  it('default ignora dateLabel', () => {
    render(<ListingResultCard {...base} dateLabel={{ day: '14', month: 'nov' }} />);
    expect(screen.queryByText('nov')).toBeNull();
  });
});
