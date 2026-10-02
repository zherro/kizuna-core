// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const m = vi.hoisted(() => ({
  fetchReaction: vi.fn(),
  saveReaction: vi.fn(),
  requireAuth: vi.fn((fn: () => void) => fn()),
  toastError: vi.fn(),
  user: { id: 'u1' } as { id: string } | null,
}));

vi.mock('./reaction-api', () => ({
  fetchReaction: m.fetchReaction,
  saveReaction: m.saveReaction,
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
const NONE = { uid: null, liked: false, favorite: false };

function setup(props: Partial<React.ComponentProps<typeof ServiceReactionButtons>> = {}) {
  return render(<ServiceReactionButtons serviceUid="s1" likeCount={3} config={CFG} {...props} />);
}

beforeEach(() => {
  m.user = { id: 'u1' };
  m.fetchReaction.mockReset().mockResolvedValue(NONE);
  m.saveReaction.mockReset().mockImplementation(async (_u, next) => ({ uid: 'r1', ...next }));
  m.requireAuth.mockReset().mockImplementation((fn: () => void) => fn());
  m.toastError.mockReset();
});
afterEach(cleanup);

describe('ServiceReactionButtons', () => {
  it('carrega o estado inicial e mostra labelActive e contador', async () => {
    m.fetchReaction.mockResolvedValue({ uid: 'r1', liked: true, favorite: true });
    setup();
    expect(await screen.findByRole('button', { name: /gostei!/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /favoritado/i })).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('Gostei grava e incrementa otimista', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /gostei/i }));
    expect(screen.getByText('4')).toBeTruthy();
    await waitFor(() => expect(m.saveReaction).toHaveBeenCalledWith('s1', { liked: true, favorite: false }));
  });

  it('Favoritar marca também Gostei', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /favoritar/i }));
    await waitFor(() => expect(m.saveReaction).toHaveBeenCalledWith('s1', { liked: true, favorite: true }));
    expect(await screen.findByRole('button', { name: /gostei!/i })).toBeTruthy();
  });

  it('Gostei com Favorito ativo desfavorita', async () => {
    m.fetchReaction.mockResolvedValue({ uid: 'r1', liked: true, favorite: true });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /gostei!/i }));
    await waitFor(() => expect(m.saveReaction).toHaveBeenCalledWith('s1', { liked: false, favorite: false }));
  });

  it('erro ao salvar reverte e avisa', async () => {
    m.saveReaction.mockRejectedValue(new Error('x'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: /gostei/i }));
    await waitFor(() => expect(m.toastError).toHaveBeenCalled());
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByRole('button', { name: /gostei/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('visitante passa pelo gate e não grava', () => {
    m.user = null;
    m.requireAuth.mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole('button', { name: /gostei/i }));
    expect(m.requireAuth).toHaveBeenCalled();
    expect(m.saveReaction).not.toHaveBeenCalled();
  });

  it('renderiza só o que está configurado', () => {
    const { unmount } = setup({ config: { like: { icon: 'ThumbsUp' } } });
    expect(screen.getByRole('button', { name: /gostei/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /favoritar/i })).toBeNull();
    unmount();
    const { container } = setup({ config: undefined });
    expect(container.innerHTML).toBe('');
  });
});
