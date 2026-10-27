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
let mockTopics: string[] | null = ['servicos'];
const saveTopics = vi.fn();
vi.mock('./swipe-topics', () => ({ loadSwipeTopics: () => mockTopics, saveSwipeTopics: (s: string[]) => saveTopics(s) }));
vi.mock('./swipe-topic-picker', () => ({
  SwipeTopicPicker: (p: { initial: string[]; onConfirm: (s: string[]) => void; onCancel?: () => void }) => (
    <div>
      <span>fake-picker</span>
      <button onClick={() => p.onConfirm(['eventos', 'saude'])}>confirmar-temas</button>
      {p.onCancel ? <button onClick={p.onCancel}>cancelar-temas</button> : null}
    </div>
  ),
}));
vi.mock('../search/use-search-filters', () => ({
  useSearchFilters: () => ({
    filters: {},
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
  mockTopics = ['servicos']; saveTopics.mockReset(); deckOpts = null;
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
  it('sem temas salvos mostra o seletor e não o card', async () => {
    mockTopics = null;
    render(<SwipePage />);
    expect(await screen.findByText('fake-picker')).toBeTruthy();
    expect(screen.queryByText('Pintor')).toBeNull();
    expect(screen.queryByText('cancelar-temas')).toBeNull();
  });
  it('confirmar temas salva e inicia o deck com p_group_slugs', async () => {
    mockTopics = null;
    render(<SwipePage />);
    fireEvent.click(await screen.findByText('confirmar-temas'));
    expect(saveTopics).toHaveBeenCalledWith(['eventos', 'saude']);
    expect(await screen.findByText('Pintor')).toBeTruthy();
    expect(deckOpts!.baseBody).toMatchObject({ p_group_slugs: ['eventos', 'saude'] });
  });
  it('com temas salvos mostra o card e manda p_group_slugs, sem filtro de preço', async () => {
    render(<SwipePage />);
    await screen.findByText('Pintor');
    expect(deckOpts!.baseBody).toMatchObject({ p_group_slugs: ['servicos'], p_price_min: null, p_price_max: null });
    expect(deckOpts!.baseBody).not.toHaveProperty('p_page');
    expect(deckOpts!.filterKey).toContain('"p_group_slugs":["servicos"]');
  });
  it('botão Temas (com contagem) reabre o seletor; cancelar volta ao swipe', async () => {
    render(<SwipePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Temas/ }));
    expect(screen.getByText('fake-picker')).toBeTruthy();
    fireEvent.click(screen.getByText('cancelar-temas'));
    expect(await screen.findByText('Pintor')).toBeTruthy();
  });
  it('não há botão de Filtros', async () => {
    render(<SwipePage />);
    await screen.findByText('Pintor');
    expect(screen.queryByText(/Filtros/)).toBeNull();
  });
  it('fim do deck: "Trocar temas" abre o seletor e "Recomeçar" reseta', async () => {
    deck = { cards: [], loading: false, exhausted: true, error: false };
    render(<SwipePage />);
    expect(await screen.findByText('Acabou por aqui')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar' }));
    expect(reset).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Trocar temas' }));
    expect(screen.getByText('fake-picker')).toBeTruthy();
  });
  it('card arrastável tem touch-action none (senão o celular cancela o arraste)', async () => {
    render(<SwipePage />);
    const card = (await screen.findByText('Pintor')).closest('article')!;
    expect(card.className).toContain('touch-none');
  });
});
