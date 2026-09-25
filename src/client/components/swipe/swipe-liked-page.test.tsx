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
    liked_at: `2026-09-${String(25 - i).padStart(2, '0')}`,
  }));

const api = vi.hoisted(() => ({
  fetchLiked: vi.fn(async (before: string | null, pageSize: number) => {
    if (before === null) {
      // First page: return 24 items
      return createMockItems(24, 0);
    }
    // Subsequent pages: return items that come after the cursor
    return [];
  }),
  recordSwipe: vi.fn(async () => {}),
}));
vi.mock('./swipe-api', () => api);
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
  vi.unstubAllGlobals();
});

describe('SwipeLikedPage', () => {
  it('lista e descurte', async () => {
    // Reset mock for this test
    api.fetchLiked.mockResolvedValueOnce([
      { uid: 'u1', title: 'Pintor', price: null, price_type: 'quote', category: 'Casa', cover_file_id: null, liked_at: '2026-09-25' },
    ]);

    render(<SwipeLikedPage />);
    expect(await screen.findByText('Pintor')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Descurtir Pintor'));
    expect(api.recordSwipe).toHaveBeenCalledWith(['u1'], 'unlike');
    await waitFor(() => expect(screen.queryByText('Pintor')).toBeNull());
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

    // Verify record was called
    expect(api.recordSwipe).toHaveBeenCalledWith(['u0'], 'unlike');

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
    api.fetchLiked.mockResolvedValueOnce([
      { uid: 'u1', title: 'Pintor', price: null, price_type: 'quote', category: 'Casa', cover_file_id: null, liked_at: '2026-09-25' },
    ]);
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
