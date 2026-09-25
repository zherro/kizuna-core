// @vitest-environment jsdom
// Fluxos ponta a ponta da página com o hook real (useSwipeDeck), o AuthProvider real,
// RequireAuthProvider + AuthModal reais e só a API/rede mockadas.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const api = vi.hoisted(() => ({
  fetchDeck: vi.fn(),
  recordSwipe: vi.fn(async () => {}),
  fetchLiked: vi.fn(async () => []),
}));
vi.mock('./swipe-api', () => api);
vi.mock('../search/location-gate', () => ({ LocationGate: (p: { children: React.ReactNode }) => <>{p.children}</> }));
vi.mock('../search/search-filters-panel', () => ({ SearchFiltersPanel: () => null }));
vi.mock('../search/use-search-filters', () => {
  const filters = { groupSlug: null, categoryId: null, subcategoryIds: [], query: null, priceMin: null, priceMax: null };
  const toSearchAdsBody = () => ({ p_state: 'PR', p_city_id: null, p_city_ibge: null, p_group_category_slug: null,
    p_category_id: null, p_subcategories: null, p_query: null, p_seed: 0, p_page: 0, p_page_size: 24 });
  return { useSearchFilters: () => ({ filters, setFilters: vi.fn(), resetFilters: vi.fn(), toSearchAdsBody }) };
});
vi.mock('../../hooks/use-user-location', () => ({ getStoredLocation: () => ({ stateCode: 'PR', cityId: 0, cityName: null }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// form falso que faz exatamente o que LoginForm faz no sucesso: setUser e onSuccess no mesmo tick
vi.mock('../auth/login-form', async () => {
  const { useAuth } = await import('../../providers/auth-provider');
  return {
    LoginForm: (p: { onSuccess: (u: unknown) => void }) => {
      const { setUser } = useAuth();
      return (
        <button onClick={() => { const u = { user_id: 'me' }; setUser(u); p.onSuccess(u); }}>fake-login</button>
      );
    },
  };
});
vi.mock('../auth/register-form', () => ({ RegisterForm: () => null }));

import { AuthProvider } from '../../providers/auth-provider';
import { SwipePage } from './swipe-page';

const card = (n: number) => ({
  uid: `u${n}`, title: `Item ${n}`, price: null, price_type: 'quote', category: null,
  subcategory: null, sponsored: false, cover_file_id: null, provider_name: null,
  provider_avatar: null, rating: null, reviews: 0,
});

function stubMe(user: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ user }), { status: 200 })));
}

beforeEach(() => {
  api.fetchDeck.mockReset();
  api.fetchDeck.mockResolvedValue([card(1), card(2), card(3)]);
  api.recordSwipe.mockClear();
  router.push.mockClear();
  window.history.replaceState(null, '');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); localStorage.clear(); });

describe('SwipePage (fluxos com auth)', () => {
  it('anônimo curte, loga pelo modal e a curtida é gravada (C1)', async () => {
    stubMe(null);
    render(<AuthProvider initialUser={null}><SwipePage /></AuthProvider>);
    expect(await screen.findByText('Item 1')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Curtir'));
    fireEvent.click(screen.getByText('fake-login'));
    await waitFor(() => expect(api.recordSwipe).toHaveBeenCalledWith(['u1'], 'like'));
    // espera o modal fechar (popstate processado, ação pendente executada) antes de contar
    await waitFor(() => expect(screen.queryByText('fake-login')).toBeNull());
    await new Promise((r) => setTimeout(r, 20));
    expect(api.recordSwipe.mock.calls).toEqual([[['u1'], 'like']]);
    expect(screen.getByText('Curtidos agora')).toBeTruthy();
    expect(screen.getAllByText('Item 1')).toHaveLength(1); // só na faixa "Curtidos agora"
    expect(screen.getByText('Item 2')).toBeTruthy();
  });

  it('C1 também sem o adiamento do popstate (onSuccess síncrono logo após setUser)', async () => {
    stubMe(null);
    render(<AuthProvider initialUser={null}><SwipePage /></AuthProvider>);
    await screen.findByText('Item 1');
    fireEvent.click(screen.getByLabelText('Curtir'));
    // entrada do modal fora do topo: o AuthModal chama onSuccess no mesmo tick do setUser
    window.history.replaceState(null, '');
    fireEvent.click(screen.getByText('fake-login'));
    expect(api.recordSwipe).toHaveBeenCalledWith(['u1'], 'like');
  });

  it('curtida pendente sobrevive ao reload: grava pelo uid e tira da fila (I2)', async () => {
    sessionStorage.setItem('kizuna.auth.pending', 'like:u2');
    stubMe({ user_id: 'me' });
    render(<AuthProvider initialUser={null}><SwipePage /></AuthProvider>);
    await waitFor(() => expect(api.recordSwipe).toHaveBeenCalledWith(['u2'], 'like'));
    expect(sessionStorage.getItem('kizuna.auth.pending')).toBeNull();
    // a fila não mostra mais o u2 (e as decisões seguintes não gravam de novo o like)
    await screen.findByText('Item 1');
    fireEvent.click(screen.getByLabelText('Passar'));
    expect(await screen.findByText('Item 3')).toBeTruthy();
    expect(screen.queryByLabelText('Curtir')).toBeTruthy();
    expect(api.recordSwipe.mock.calls.filter((c) => c[1] === 'like')).toHaveLength(1);
  });

  it('curtida pendente de item fora da fila também é gravada', async () => {
    sessionStorage.setItem('kizuna.auth.pending', 'like:u99');
    stubMe({ user_id: 'me' });
    render(<AuthProvider initialUser={null}><SwipePage /></AuthProvider>);
    await waitFor(() => expect(api.recordSwipe).toHaveBeenCalledWith(['u99'], 'like'));
    expect(await screen.findByText('Item 1')).toBeTruthy();
  });

  it('anônimo em "Curtidos": loga pelo modal e navega pelo router (não recarrega)', async () => {
    stubMe(null);
    render(<AuthProvider initialUser={null}><SwipePage /></AuthProvider>);
    await screen.findByText('Item 1');
    fireEvent.click(screen.getByRole('button', { name: 'Curtidos' }));
    fireEvent.click(screen.getByText('fake-login'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/curtidos'));
  });
});
