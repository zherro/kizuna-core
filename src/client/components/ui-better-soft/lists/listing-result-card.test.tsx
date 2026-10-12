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
    locationLabel: 'Arena Pantanal',
    ctaLabel: 'Ver evento',
    rating: 4.5,
    reviewCount: 3,
  };

  it.each(['grid', 'strip'] as const)('mostra data, local e preço com legenda (%s)', (variant) => {
    render(<ListingResultCard {...evento} variant={variant} />);
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('nov')).toBeTruthy();
    expect(screen.getByText('Arena Pantanal')).toBeTruthy();
    expect(screen.getByText('A partir de')).toBeTruthy();
    expect(screen.getByText('R$ 40,00')).toBeTruthy();
  });

  it('grid: CTA do evento e sem nota', () => {
    render(<ListingResultCard {...evento} />);
    expect(screen.getByText('Ver evento')).toBeTruthy();
    expect(screen.queryByText('4,5')).toBeNull();
    expect(screen.queryByText('Novo')).toBeNull();
  });

  it('sem dateLabel não renderiza bloco de data; Gratuito sem legenda', () => {
    render(<ListingResultCard {...evento} dateLabel={null} priceLabel="Gratuito" priceCaption={null} />);
    expect(screen.queryByText('nov')).toBeNull();
    expect(screen.getByText('Gratuito')).toBeTruthy();
    expect(screen.queryByText('A partir de')).toBeNull();
  });

  it('default ignora dateLabel', () => {
    render(<ListingResultCard {...base} dateLabel={{ day: '14', month: 'nov' }} />);
    expect(screen.queryByText('nov')).toBeNull();
  });
});
