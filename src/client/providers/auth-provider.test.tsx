// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';

function Probe() {
  const { user, loading, setUser } = useAuth();
  return (
    <div>
      <span>{loading ? 'loading' : 'ready'}</span>
      <span>{user ? `user:${user.user_id}` : 'anon'}</span>
      <button onClick={() => setUser({ user_id: 'manual' })}>login</button>
    </div>
  );
}

function stubMe(user: unknown) {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => { resolve = r; });
  // respeita o AbortSignal como o fetch real (o cleanup do effect aborta)
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: { signal?: AbortSignal }) => {
    await gate;
    if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    return new Response(JSON.stringify({ user }), { status: 200 });
  }));
  return resolve;
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AuthProvider.loading', () => {
  it('sem initialUser: loading até o /api/auth/me responder (com usuário)', async () => {
    const release = stubMe({ user_id: 'u1' });
    render(<AuthProvider initialUser={null}><Probe /></AuthProvider>);
    expect(screen.getByText('loading')).toBeTruthy();
    expect(screen.getByText('anon')).toBeTruthy();
    await act(async () => { release(); });
    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByText('user:u1')).toBeTruthy();
  });

  it('sem initialUser: loading termina também quando não há sessão', async () => {
    const release = stubMe(null);
    render(<AuthProvider initialUser={null}><Probe /></AuthProvider>);
    await act(async () => { release(); });
    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByText('anon')).toBeTruthy();
  });

  it('com initialUser: já nasce pronto e não busca /me', () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<AuthProvider initialUser={{ user_id: 'srv' }}><Probe /></AuthProvider>);
    expect(screen.getByText('ready')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('setUser manual resolve o loading', () => {
    stubMe(null); // nunca liberado
    render(<AuthProvider initialUser={null}><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText('login'));
    expect(screen.getByText('ready')).toBeTruthy();
    expect(screen.getByText('user:manual')).toBeTruthy();
  });

  it('StrictMode (effect montado duas vezes) ainda hidrata', async () => {
    const release = stubMe({ user_id: 'u1' });
    render(<StrictMode><AuthProvider initialUser={null}><Probe /></AuthProvider></StrictMode>);
    await act(async () => { release(); });
    expect(await screen.findByText('user:u1')).toBeTruthy();
    expect(screen.getByText('ready')).toBeTruthy();
  });
});
