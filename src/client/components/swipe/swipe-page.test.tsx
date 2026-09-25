// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const decide = vi.fn();
vi.mock('./use-swipe-deck', () => ({
  useSwipeDeck: () => ({
    cards: [{ uid: 'u1', title: 'Pintor', price: 100, price_type: 'hour', category: 'Casa',
      subcategory: null, sponsored: false, cover_file_id: null, provider_name: 'Ana',
      provider_avatar: null, rating: 4.5, reviews: 3 }],
    loading: false, exhausted: false, decide, reset: vi.fn(),
  }),
}));
vi.mock('../search/location-gate', () => ({ LocationGate: (p: { children: React.ReactNode }) => <>{p.children}</> }));
vi.mock('../search/search-filters-panel', () => ({ SearchFiltersPanel: () => null }));
vi.mock('../search/use-search-filters', () => ({
  useSearchFilters: () => ({
    filters: { groupSlug: null, categoryId: null, subcategoryIds: [], query: null, priceMin: null, priceMax: null },
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
vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));

import { SwipePage } from './swipe-page';

afterEach(() => { cleanup(); decide.mockReset(); mockUser = null; });

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
    expect(decide).toHaveBeenCalledWith('like');
  });
});
