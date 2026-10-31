import { describe, expect, it, vi } from 'vitest';

const pgrstRpc = vi.fn();
const getAuthHeaderFromCookies = vi.fn(async () => 'Bearer x');
vi.mock('./postrest/conn', () => ({ pgrstRpc: (...a: unknown[]) => pgrstRpc(...a) }));
vi.mock('./auth', () => ({ getAuthHeaderFromCookies: () => getAuthHeaderFromCookies() }));
import { isOnboardingCompletedServer } from './onboarding';

describe('isOnboardingCompletedServer', () => {
  it('true quando a RPC devolve true', async () => {
    pgrstRpc.mockResolvedValue({ ok: true, json: async () => true });
    expect(await isOnboardingCompletedServer()).toBe(true);
  });
  it('false quando a RPC devolve false', async () => {
    pgrstRpc.mockResolvedValue({ ok: true, json: async () => false });
    expect(await isOnboardingCompletedServer()).toBe(false);
  });
  it('fail-open: true quando a RPC falha', async () => {
    pgrstRpc.mockResolvedValue({ ok: false, json: async () => null });
    expect(await isOnboardingCompletedServer()).toBe(true);
  });
});
