// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const createMockItems = (count: number, startIdx: number = 0) =>
  Array.from({ length: count }, (_, i) => ({
    uid: `u${startIdx + i}`,
    title: `Item ${startIdx + i}`,
    price: null,
    price_type: 'quote',
    category: 'Casa',
    cover_file_id: null,
    liked: true,
    favorite: false,
    liked_at: `2026-09-${String(25 - i).padStart(2, '0')}`,
  }));

const pintor = (p: { liked?: boolean; favorite?: boolean } = {}) => ({
  uid: 'u1', title: 'Pintor', price: null, price_type: 'quote', category: 'Casa', cover_file_id: null,
  liked: true, favorite: false, liked_at: '2026-09-25', ...p,
});

const api = vi.hoisted(() => ({
  fetchLiked: vi.fn(async (before: string | null, pageSize: number) => {
    if (before === null) {
      // First page: return 24 items
      return createMockItems(24, 0);
    }
    // Subsequent pages: return items that come after the cursor
    return [];
  }),
}));
const reaction = vi.hoisted(() => ({ setReaction: vi.fn(async () => ({})) }));
const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('./swipe-api', () => api);
vi.mock('../services/detail/reaction-api', () => reaction);
vi.mock('../../hooks/use-toast', () => ({ useToast: () => ({ error: toast.error, success: vi.fn(), info: vi.fn() }) }));
vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));
// form falso que faz o que LoginForm faz no sucesso: setUser e onSuccess no mesmo tick
vi.mock('../auth/login-form', async () => {
  const { useAuth } = await import('../../providers/auth-provider');
  return {
    LoginForm: (p: { onSuccess: (u: unknown) => void }) => {
      const { setUser } = useAuth();
      return <button onClick={() => { const u = { user_id: 'me' }; setUser(u); p.onSuccess(u); }}>fake-login</button>;
    },
  };
});
vi.mock('../auth/register-form', () => ({ RegisterForm: () => null }));

import { AuthProvider } from '../../providers/auth-provider';
import { SwipeLikedPage as LikedPage } from './swipe-liked-page';

/** /api/auth/me (hidratação do AuthProvider); `release` controla quando responde. */
function stubMe(user: unknown, opts: { hold?: boolean } = {}) {
  let release!: () => void;
  const gate = opts.hold ? new Promise<void>((r) => { release = r; }) : Promise.resolve();
  vi.stubGlobal('fetch', vi.fn(async () => {
    await gate;
    return new Response(JSON.stringify({ user }), { status: 200 });
  }));
  return () => release();
}

// a página real vive sob o AuthProvider do layout raiz, que hidrata a sessão (initialUser null)
function SwipeLikedPage() {
  return <AuthProvider initialUser={null}><LikedPage /></AuthProvider>;
}

beforeEach(() => { stubMe({ user_id: 'me' }); window.history.replaceState(null, ''); });
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  api.fetchLiked.mockReset().mockImplementation(async (before: string | null) => (before === null ? createMockItems(24, 0) : []));
  reaction.setReaction.mockReset().mockResolvedValue({});
  vi.unstubAllGlobals();
});

describe('SwipeLikedPage', () => {
  it('lista curtidos e favoritos juntos; desligar os dois tira o item', async () => {
    api.fetchLiked.mockResolvedValueOnce([pintor({ liked: true, favorite: true })]);

    render(<SwipeLikedPage />);
    expect(await screen.findByText('Pintor')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Descurtir Pintor'));
    await waitFor(() => expect(reaction.setReaction).toHaveBeenCalledWith('u1', 'like', false));
    expect(screen.getByText('Pintor')).toBeTruthy(); // ainda favorito
    fireEvent.click(screen.getByLabelText('Desfavoritar Pintor'));
    await waitFor(() => expect(reaction.setReaction).toHaveBeenCalledWith('u1', 'favorite', false));
    await waitFor(() => expect(screen.queryByText('Pintor')).toBeNull());
  });

  it('favoritar pelo card liga o favorito', async () => {
    api.fetchLiked.mockResolvedValueOnce([pintor()]);
    render(<SwipeLikedPage />);
    fireEvent.click(await screen.findByLabelText('Favoritar Pintor'));
    await waitFor(() => expect(reaction.setReaction).toHaveBeenCalledWith('u1', 'favorite', true));
    expect(screen.getByLabelText('Desfavoritar Pintor').getAttribute('aria-pressed')).toBe('true');
  });

  it('erro ao salvar desfaz e avisa', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.fetchLiked.mockResolvedValueOnce([pintor()]);
    reaction.setReaction.mockRejectedValueOnce(new Error('x'));
    render(<SwipeLikedPage />);
    fireEvent.click(await screen.findByLabelText('Descurtir Pintor'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('Pintor')).toBeTruthy();
    warn.mockRestore();
  });

  it('pagina com cursor baseado em liked_at', async () => {
    // First page: 24 items
    api.fetchLiked.mockResolvedValueOnce(createMockItems(24, 0));
    // Second page (after load more): should be called with the liked_at of the last item
    api.fetchLiked.mockResolvedValueOnce([]);

    render(<SwipeLikedPage />);

    // Wait for first batch to load
    expect(await screen.findByText('Item 0')).toBeTruthy();
    expect(screen.getByText('Item 23')).toBeTruthy();

    // Unlike one item
    const unlikeButtons = screen.getAllByLabelText(/Descurtir Item/);
    fireEvent.click(unlikeButtons[0]); // Unlike first item

    expect(reaction.setReaction).toHaveBeenCalledWith('u0', 'like', false);

    // Click load more
    const loadMoreBtn = screen.getByText('Carregar mais');
    fireEvent.click(loadMoreBtn);

    // Verify fetchLiked was called with the liked_at of the last remaining item (Item 23)
    await waitFor(() => {
      expect(api.fetchLiked).toHaveBeenCalledWith('2026-09-02', 24);
    });
  });

  it('erro ao carregar mostra mensagem e "Tentar de novo" recarrega', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.fetchLiked.mockRejectedValueOnce(new Error('fn_swipe_liked 500'));
    api.fetchLiked.mockResolvedValueOnce([pintor()]);
    render(<SwipeLikedPage />);
    expect(await screen.findByText(/Não foi possível carregar/)).toBeTruthy();
    expect(screen.queryByText('Você ainda não curtiu nada.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Pintor')).toBeTruthy();
    expect(screen.queryByText(/Não foi possível carregar/)).toBeNull();
    warn.mockRestore();
  });

  it('enquanto a sessão hidrata mostra carregando e não busca nem redireciona', async () => {
    const release = stubMe({ user_id: 'me' }, { hold: true });
    render(<SwipeLikedPage />);
    expect(screen.getByText('Carregando…')).toBeTruthy();
    expect(api.fetchLiked).not.toHaveBeenCalled();
    expect(screen.queryByText(/Entre para ver seus curtidos/)).toBeNull();
    release();
    expect(await screen.findByText('Item 0')).toBeTruthy();
  });

  it('anônimo: pede login sem buscar; logar pelo modal carrega a lista', async () => {
    stubMe(null);
    render(<SwipeLikedPage />);
    expect(await screen.findByText(/Entre para ver seus curtidos/)).toBeTruthy();
    expect(api.fetchLiked).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    fireEvent.click(screen.getByText('fake-login'));
    expect(await screen.findByText('Item 0')).toBeTruthy();
    expect(screen.queryByText(/Entre para ver seus curtidos/)).toBeNull();
    await waitFor(() => expect(screen.queryByText('fake-login')).toBeNull());
    expect(api.fetchLiked).toHaveBeenCalledTimes(1);
    expect(api.fetchLiked).toHaveBeenCalledWith(null, 24);
  });
});
