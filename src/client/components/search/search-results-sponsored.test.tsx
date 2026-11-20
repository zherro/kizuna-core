// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResultsView } from './search-results-view';
import type { ServiceResult } from './search-types';
import { __resetLiveBoosts } from '../../marketing/live-boosts';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const base = (uid: string, over: Partial<ServiceResult> = {}): ServiceResult =>
  ({
    uid,
    title: `Título ${uid}`,
    price: null,
    price_type: 'fixed',
    category: 'Bares',
    category_slug: 'bares',
    category_group_slug: 'lugares',
    subcategory: null,
    sponsored: false,
    cover_file_id: null,
    provider_name: null,
    provider_avatar: null,
    rating: null,
    reviews: 0,
    city: 'Cuiabá',
    state: 'MT',
    boosted: false,
    sponsor_slot: null,
    ...over,
  }) as ServiceResult;

const fetchMock = vi.fn();

function view(results: ServiceResult[]) {
  return render(
    <SearchResultsView
      results={results}
      loading={false}
      scope="city"
      stateName="MT"
      cityName="Cuiabá"
      layout="grid"
      onClearFilters={() => {}}
      onChangeLocation={() => {}}
    />,
  );
}

beforeEach(() => {
  __resetLiveBoosts();
  fetchMock.mockReset().mockResolvedValue(new Response('{"items":[]}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SearchResultsView — vaga patrocinada resolvida no banco', () => {
  it('impulsionado com sponsor_slot vai à faixa "Patrocinado" no topo, com link marcado e sem consulta extra', () => {
    view([base('a'), base('b'), base('p', { boosted: true, sponsor_slot: 1 }), base('c')]);
    const strip = document.querySelector('[data-sponsored-strip]') as HTMLElement;
    expect(strip).not.toBeNull();
    const links = within(strip).getAllByRole('link');
    expect(links.some((l) => l.getAttribute('href')?.includes('pl=sp'))).toBe(true);
    expect(within(strip).getAllByText('Patrocinado').length).toBeGreaterThan(0);
    // o patrocinado não se repete na lista orgânica
    expect(screen.getAllByText('Título p')).toHaveLength(1);
    // o servidor já disse quem é impulsionado: nenhuma consulta a vw_boosts_live
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('vw_boosts_live'))).toBe(false);
  });

  it('impulsionado fora da vaga (boosted sem sponsor_slot) fica no lugar orgânico, com o selo, sem faixa', () => {
    view([base('a'), base('p', { boosted: true }), base('c')]);
    expect(document.querySelector('[data-sponsored-strip]')).toBeNull();
    expect(document.querySelector('[data-bora-indica]')).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
