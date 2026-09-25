// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const decide = vi.fn();
const reset = vi.fn();
const pintor = { uid: 'u1', title: 'Pintor', price: 100, price_type: 'hour', category: 'Casa',
  subcategory: null, sponsored: false, cover_file_id: null, provider_name: 'Ana',
  provider_avatar: null, rating: 4.5, reviews: 3 };
let deck: { cards: unknown[]; loading: boolean; exhausted: boolean; error: boolean } = {
  cards: [pintor], loading: false, exhausted: false, error: false,
};
let deckOpts: { baseBody: Record<string, unknown>; filterKey: string } | null = null;
vi.mock('./use-swipe-deck', () => ({
  useSwipeDeck: (opts: { baseBody: Record<string, unknown>; filterKey: string }) => {
    deckOpts = opts;
    return { ...deck, decide, reset, drop: vi.fn() };
  },
}));
vi.mock('../search/location-gate', () => ({ LocationGate: (p: { children: React.ReactNode }) => <>{p.children}</> }));
vi.mock('../search/search-filters-panel', () => ({ SearchFiltersPanel: () => null }));
const noFilters = { groupSlug: null, categoryId: null, subcategoryIds: [], query: null, priceMin: null, priceMax: null };
let mockFilters: Record<string, unknown> = noFilters;
vi.mock('../search/use-search-filters', () => ({
  useSearchFilters: () => ({
    filters: mockFilters,
    setFilters: vi.fn(), resetFilters: vi.fn(),
    toSearchAdsBody: () => ({ p_state: 'PR', p_city_id: null, p_city_ibge: null, p_group_category_slug: null,
      p_category_id: null, p_subcategories: null, p_query: null, p_seed: 0, p_page: 0, p_page_size: 24 }),
  }),
}));
vi.mock('../../hooks/use-user-location', () => ({ getStoredLocation: () => ({ stateCode: 'PR', cityId: 0, cityName: null }) }));
let mockUser: unknown = null;
vi.mock('../../providers/auth-provider', () => ({ useAuth: () => ({ user: mockUser, setUser: vi.fn() }) }));
vi.mock('../auth/login-form', () => ({ LoginForm: () => <div>fake-login</div> }));
vi.mock('../auth/register-form', () => ({ RegisterForm: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));

import { SwipePage } from './swipe-page';

afterEach(() => {
  cleanup(); decide.mockReset(); reset.mockReset(); mockUser = null;
  deck = { cards: [pintor], loading: false, exhausted: false, error: false };
  mockFilters = noFilters; deckOpts = null;
});

describe('SwipePage', () => {
  it('mostra o card', async () => {
    render(<SwipePage />);
    expect(await screen.findByText('Pintor')).toBeTruthy();
  });
  it('anônimo: curtir abre o modal e não decide', async () => {
    render(<SwipePage />);
    fireEvent.click(await screen.findByLabelText('Curtir'));
    expect(decide).not.toHaveBeenCalled();
    expect(screen.getByText('fake-login')).toBeTruthy();
  });
  it('anônimo: passar decide direto', async () => {
    render(<SwipePage />);
    fireEvent.click(await screen.findByLabelText('Passar'));
    expect(decide).toHaveBeenCalledWith('skip');
  });
  it('logado: curtir decide', async () => {
    mockUser = { uid: 'u' };
    render(<SwipePage />);
    fireEvent.click(await screen.findByLabelText('Curtir'));
    expect(decide).toHaveBeenCalledWith('like', { loggedIn: true });
  });
  it('erro sem cards mostra "Tentar de novo" que chama reset', async () => {
    deck = { cards: [], loading: false, exhausted: false, error: true };
    render(<SwipePage />);
    expect(await screen.findByText(/Não foi possível carregar/)).toBeTruthy();
    expect(screen.queryByText('Acabou por aqui')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(reset).toHaveBeenCalledOnce();
  });
  it('faixa de preço vai no corpo do deck (e no filterKey, que reseta o deck)', async () => {
    mockFilters = { ...noFilters, priceMin: 50, priceMax: 200 };
    render(<SwipePage />);
    await screen.findByText('Pintor');
    expect(deckOpts!.baseBody).toMatchObject({ p_price_min: 50, p_price_max: 200 });
    expect(deckOpts!.baseBody).not.toHaveProperty('p_page');
    expect(deckOpts!.filterKey).toContain('"p_price_max":200');
  });
});
