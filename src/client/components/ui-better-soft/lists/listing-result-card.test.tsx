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
