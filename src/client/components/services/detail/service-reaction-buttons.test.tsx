// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({
  fetchReaction: vi.fn(),
  setReaction: vi.fn(),
  requireAuth: vi.fn((fn: () => void) => fn()),
  toastError: vi.fn(),
  user: { id: 'u1' } as { id: string } | null,
}));

vi.mock('./reaction-api', () => ({
  fetchReaction: m.fetchReaction,
  setReaction: m.setReaction,
}));
vi.mock('../../../providers/auth-provider', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ error: m.toastError, success: vi.fn(), info: vi.fn() }),
}));
vi.mock('../../auth/require-auth', () => ({
  RequireAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRequireAuth: () => m.requireAuth,
}));
vi.mock('../../../analytics/analytics-api', () => ({ trackEvent: vi.fn() }));

import { ServiceReactionButtons } from './service-reaction-buttons';

const CFG = {
  like: { icon: 'ThumbsUp', label: 'Gostei', labelActive: 'Gostei!' },
  favorite: { icon: 'Heart', label: 'Favoritar', labelActive: 'Favoritado' },
};
const state = (p: Partial<{ liked: boolean; favorite: boolean; likeCount: number; favoriteCount: number }> = {}) => ({
  liked: false,
  favorite: false,
  likeCount: 3,
  favoriteCount: 1,
  ...p,
});

function setup(props: Partial<React.ComponentProps<typeof ServiceReactionButtons>> = {}) {
  return render(
    <ServiceReactionButtons serviceUid="s1" likeCount={3} favoriteCount={1} config={CFG} {...props} />
  );
}

beforeEach(() => {
  m.user = { id: 'u1' };
  m.fetchReaction.mockReset().mockResolvedValue(state());
  m.setReaction.mockReset().mockImplementation(async (_u: string, kind: string, active: boolean) =>
    kind === 'like'
      ? state({ liked: active, likeCount: active ? 4 : 2 })
      : state({ favorite: active, favoriteCount: active ? 2 : 0 })
  );
  m.requireAuth.mockReset().mockImplementation((fn: () => void) => fn());
  m.toastError.mockReset();
});
afterEach(cleanup);

const likeBtn = () => screen.getByRole('button', { name: /gostei/i });
const favBtn = () => screen.getByRole('button', { name: /favorit/i });

describe('ServiceReactionButtons', () => {
  it('carrega o estado inicial e mostra labelActive e os dois totais', async () => {
    m.fetchReaction.mockResolvedValue(state({ liked: true, favorite: true, likeCount: 7, favoriteCount: 5 }));
    setup();
    expect(await screen.findByRole('button', { name: /gostei!/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /favoritado/i })).toBeTruthy();
    expect(likeBtn().textContent).toContain('7');
    expect(favBtn().textContent).toContain('5');
  });

  it('Gostei grava só o like e incrementa otimista', async () => {
    setup();
    await waitFor(() => expect(m.fetchReaction).toHaveBeenCalled());
    fireEvent.click(likeBtn());
    expect(likeBtn().textContent).toContain('4');
    await waitFor(() => expect(m.setReaction).toHaveBeenCalledWith('s1', 'like', true));
    expect(favBtn().getAttribute('aria-pressed')).toBe('false');
  });

  it('Favoritar é independente do Gostei', async () => {
    setup();
    await waitFor(() => expect(m.fetchReaction).toHaveBeenCalled());
    fireEvent.click(favBtn());
    await waitFor(() => expect(m.setReaction).toHaveBeenCalledWith('s1', 'favorite', true));
    expect(await screen.findByRole('button', { name: /favoritado/i })).toBeTruthy();
    expect(favBtn().textContent).toContain('2');
    expect(likeBtn().getAttribute('aria-pressed')).toBe('false');
  });

  it('remover favorito desliga só o favorito', async () => {
    m.fetchReaction.mockResolvedValue(state({ liked: true, favorite: true }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /favoritado/i }));
    await waitFor(() => expect(m.setReaction).toHaveBeenCalledWith('s1', 'favorite', false));
    expect(m.setReaction).toHaveBeenCalledTimes(1);
  });

  it('erro ao salvar reverte e avisa', async () => {
    m.setReaction.mockRejectedValue(new Error('x'));
    setup();
    await waitFor(() => expect(m.fetchReaction).toHaveBeenCalled());
    fireEvent.click(likeBtn());
    await waitFor(() => expect(m.toastError).toHaveBeenCalled());
    expect(likeBtn().textContent).toContain('3');
    expect(likeBtn().getAttribute('aria-pressed')).toBe('false');
  });

  it('visitante passa pelo gate e não grava', () => {
    m.user = null;
    m.requireAuth.mockImplementation(() => {});
    setup();
    fireEvent.click(likeBtn());
    expect(m.requireAuth).toHaveBeenCalled();
    expect(m.setReaction).not.toHaveBeenCalled();
  });

  it('renderiza só o que está configurado', () => {
    const { unmount } = setup({ config: { like: { icon: 'ThumbsUp' } } });
    expect(likeBtn()).toBeTruthy();
    expect(screen.queryByRole('button', { name: /favorit/i })).toBeNull();
    unmount();
    const { container } = setup({ config: undefined });
    expect(container.innerHTML).toBe('');
  });
});
