// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SearchFiltersPanel } from './search-filters-panel';
import { __resetCitiesCache } from './filters/filter-cities';
import type { SearchFilterPatch, SearchFilters } from './search-types';

// ─── dados de teste ──────────────────────────────────────────────────────────────────────────

const GROUPS = [
  { id: 1, name: 'Eventos', slug: 'eventos', icon: 'PartyPopper', sortOrder: 1, active: true },
  { id: 2, name: 'Serviços', slug: 'servicos', icon: null, sortOrder: 2, active: true },
];

const CATEGORIES = [
  { id: 10, name: 'Shows', icon: null, categoryGroupId: 1, extraGroupIds: [], active: true },
  { id: 11, name: 'Teatro', icon: null, categoryGroupId: 1, extraGroupIds: [], active: true },
  { id: 20, name: 'Eletricista', icon: null, categoryGroupId: 2, extraGroupIds: [1], active: true },
];

const STATS = [
  { id: 101, categoryId: 10, categoryName: 'Shows', categoryGroupId: 1, subcategoryId: 101, subcategoryName: 'Sertanejo' },
  { id: 102, categoryId: 10, categoryName: 'Shows', categoryGroupId: 1, subcategoryId: 102, subcategoryName: 'Rock' },
  { id: 111, categoryId: 11, categoryName: 'Teatro', categoryGroupId: 1, subcategoryId: 111, subcategoryName: 'Comédia' },
  { id: 201, categoryId: 20, categoryName: 'Eletricista', categoryGroupId: 2, subcategoryId: 201, subcategoryName: 'Residencial' },
];

const ROWS: Record<string, unknown[]> = {
  categories_group_public: GROUPS,
  categories_public: CATEGORIES,
  category_stats: STATS,
};

vi.mock('../../hooks', () => ({
  useResourceOptions: ({ resource }: { resource: string }) => ({
    options: ROWS[resource] ?? [],
    loading: false,
    error: '',
    getLabel: () => '',
  }),
}));

// `countActiveFilters` é de outro arquivo (em evolução): o painel só precisa de uma contagem.
vi.mock('./use-search-filters', () => ({
  countActiveFilters: (f: SearchFilters) =>
    (f.groupSlug ? 1 : 0) +
    f.categoryIds.length +
    f.subcategoryIds.length +
    (f.cityIds ? 1 : 0) +
    (f.query ? 1 : 0),
}));

const CITIES = [
  { value: '5103403', label: 'Cuiabá', stateCode: 'MT', stateName: 'Mato Grosso' },
  { value: '5108402', label: 'Várzea Grande', stateCode: 'MT', stateName: 'Mato Grosso' },
  { value: '5107602', label: 'Rondonópolis', stateCode: 'MT', stateName: 'Mato Grosso' },
  { value: '5107909', label: 'Sinop', stateCode: 'MT', stateName: 'Mato Grosso' },
];
const DEFAULT_CITIES = ['5103403', '5108402'];

const BASE: SearchFilters = {
  state: 'MT',
  cityId: 5103403,
  cityName: 'Cuiabá',
  groupSlug: null,
  categoryIds: [],
  subcategoryIds: [],
  cityIds: null,
  query: null,
  priceMin: null,
  priceMax: null,
  sort: 'relevance',
};

function Harness({
  initial = {},
  spy,
  reset,
}: {
  initial?: Partial<SearchFilters>;
  spy: (patch: SearchFilterPatch) => void;
  reset?: () => void;
}) {
  const [filters, setLocal] = useState<SearchFilters>({ ...BASE, ...initial });
  return (
    <SearchFiltersPanel
      filters={filters}
      setFilters={(patch) => {
        spy(patch);
        setLocal((prev) => ({ ...prev, ...patch }));
      }}
      resetFilters={() => {
        reset?.();
        setLocal({ ...BASE });
      }}
      effectiveCityIds={filters.cityIds ?? DEFAULT_CITIES}
      defaultCityIds={DEFAULT_CITIES}
    />
  );
}

beforeEach(() => {
  __resetCitiesCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ items: CITIES }), { status: 200 }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const checkbox = (name: string) => screen.getByRole('checkbox', { name });

// ─── testes ──────────────────────────────────────────────────────────────────────────────────

describe('SearchFiltersPanel — grupos e categorias', () => {
  it('sem grupo e sem categoria mostra os grupos como links (não uma parede de categorias)', async () => {
    render(<Harness spy={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /Todas as categorias/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Eventos/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Serviços/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('escolher um grupo mostra as categorias dele (primárias e extras) e zera a seleção', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    fireEvent.click(await screen.findByRole('button', { name: /Eventos/ }));

    expect(spy).toHaveBeenCalledWith({ groupSlug: 'eventos', categoryIds: [], subcategoryIds: [] });
    // hero com o nome do grupo + categorias do grupo (Eletricista entra por ligação extra)
    expect(screen.getByRole('button', { name: 'Eventos, trocar de grupo' })).toBeTruthy();
    expect(checkbox('Shows')).toBeTruthy();
    expect(checkbox('Teatro')).toBeTruthy();
    expect(checkbox('Eletricista')).toBeTruthy();
  });

  it('multi-seleção: marca categorias do mesmo grupo e abre as especialidades delas', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ groupSlug: 'eventos' }} />);

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Shows' }));
    expect(spy).toHaveBeenLastCalledWith({ categoryIds: [10], subcategoryIds: [] });
    expect(checkbox('Shows').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('button', { name: 'Sertanejo' })).toBeTruthy();
    expect(screen.getByText('1 selecionada')).toBeTruthy();

    fireEvent.click(checkbox('Teatro'));
    expect(spy).toHaveBeenLastCalledWith({ categoryIds: [10, 11], subcategoryIds: [] });
    expect(screen.getByText('2 selecionadas')).toBeTruthy();
    // com mais de uma categoria marcada, cada bloco de especialidades leva o nome da categoria
    expect(screen.getByRole('group', { name: 'Especialidades de Teatro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Comédia' })).toBeTruthy();
  });

  it('as marcadas sobem para o topo da lista', async () => {
    render(<Harness spy={vi.fn()} initial={{ groupSlug: 'eventos' }} />);
    const list = await screen.findByRole('group', { name: 'Categorias de Eventos' });
    const names = () => within(list).getAllByRole('checkbox').map((el) => el.textContent);
    expect(names()).toEqual(['Eletricista', 'Shows', 'Teatro']);
    fireEvent.click(checkbox('Teatro'));
    expect(names()).toEqual(['Teatro', 'Eletricista', 'Shows']);
  });

  it('desmarcar a categoria remove também as especialidades dela (patch explícito)', async () => {
    const spy = vi.fn();
    render(
      <Harness
        spy={spy}
        initial={{ groupSlug: 'eventos', categoryIds: [10, 11], subcategoryIds: [101, 111] }}
      />
    );
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Shows' }));
    expect(spy).toHaveBeenLastCalledWith({ categoryIds: [11], subcategoryIds: [111] });
  });

  it('alternar uma especialidade manda a lista nova', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ groupSlug: 'eventos', categoryIds: [10] }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rock' }));
    expect(spy).toHaveBeenLastCalledWith({ subcategoryIds: [102] });
    expect(screen.getByRole('button', { name: 'Rock' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('deduz o grupo pela categoria marcada, sem gravar groupSlug', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ categoryIds: [11] }} />);
    expect(await screen.findByRole('button', { name: 'Eventos, trocar de grupo' })).toBeTruthy();
    expect(checkbox('Teatro').getAttribute('aria-checked')).toBe('true');
    expect(spy).not.toHaveBeenCalled();
  });

  it('desmarcar a última categoria de um grupo deduzido mantém a visão do grupo', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ categoryIds: [11] }} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Teatro' }));
    expect(spy).toHaveBeenLastCalledWith({ categoryIds: [], subcategoryIds: [] });
    expect(screen.getByRole('button', { name: 'Eventos, trocar de grupo' })).toBeTruthy();
    expect(checkbox('Shows')).toBeTruthy();
  });

  it('clicar no grupo troca para a lista de grupos; "Todas as categorias" limpa o grupo', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ groupSlug: 'eventos', categoryIds: [10] }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Eventos, trocar de grupo' }));

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('button', { name: /Serviços/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Voltar para Eventos/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Todas as categorias/ }));
    expect(spy).toHaveBeenLastCalledWith({ groupSlug: null, categoryIds: [], subcategoryIds: [] });
  });

  it('voltar sem escolher mantém o grupo e a seleção', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={{ groupSlug: 'eventos', categoryIds: [10] }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Eventos, trocar de grupo' }));
    fireEvent.click(screen.getByRole('button', { name: /Voltar para Eventos/ }));
    expect(checkbox('Shows').getAttribute('aria-checked')).toBe('true');
    expect(spy).not.toHaveBeenCalled();
  });

  it('anuncia o resumo dos filtros em região aria-live', async () => {
    render(<Harness spy={vi.fn()} initial={{ groupSlug: 'eventos', categoryIds: [10, 11] }} />);
    const status = await screen.findByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('3 filtros aplicados');
  });
});

describe('SearchFiltersPanel — localização', () => {
  it('mostra as cidades em vigor com o nome resolvido pelo catálogo', async () => {
    render(<Harness spy={vi.fn()} />);
    expect(await screen.findByText('Cuiabá')).toBeTruthy();
    expect(screen.getByText('Várzea Grande')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('remover uma cidade manda a lista restante', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Várzea Grande' }));
    expect(spy).toHaveBeenLastCalledWith({ cityIds: ['5103403'] });
    // fora do padrão → link discreto pra voltar
    expect(screen.getByRole('button', { name: 'voltar ao padrão' })).toBeTruthy();
  });

  it('adicionar cidade pelo mini-seletor (busca sem acento, já escolhidas ficam de fora)', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await screen.findByText('Cuiabá');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar cidade/ }));

    const input = screen.getByPlaceholderText('Buscar cidade...');
    fireEvent.change(input, { target: { value: 'RONDONOPOLIS' } });
    expect(screen.queryByRole('button', { name: 'Cuiabá – MT' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rondonópolis – MT' }));

    expect(spy).toHaveBeenLastCalledWith({ cityIds: [...DEFAULT_CITIES, '5107602'] });
    expect(screen.getByText('Rondonópolis')).toBeTruthy();
  });

  it('tirar todas as cidades vira "Estado inteiro" e dá pra voltar ao padrão', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Cuiabá' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover Várzea Grande' }));
    expect(spy).toHaveBeenLastCalledWith({ cityIds: [] });
    expect(screen.getByText(/Estado inteiro/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'voltar ao padrão' }));
    expect(spy).toHaveBeenLastCalledWith({ cityIds: null });
    await waitFor(() => expect(screen.getByText('Cuiabá')).toBeTruthy());
  });
});

describe('SearchFiltersPanel — limpar', () => {
  it('o botão "Limpar filtros" só aparece quando há filtro ativo', async () => {
    const reset = vi.fn();
    const { unmount } = render(<Harness spy={vi.fn()} reset={reset} />);
    await screen.findByText('Cuiabá');
    expect(screen.queryByRole('button', { name: /Limpar filtros/ })).toBeNull();
    unmount();

    render(<Harness spy={vi.fn()} reset={reset} initial={{ groupSlug: 'eventos', categoryIds: [10] }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Limpar filtros/ }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
