import { describe, expect, it, vi } from 'vitest';
import { createSessionRevocationChecker, type UserStatus } from './session-revocation';

const T0 = Date.parse('2026-09-29T12:00:00Z');
const issuedHourAgo = T0 / 1000 - 3600;

function checkerWith(status: UserStatus, now: () => number = () => T0) {
  const fetchStatus = vi.fn(async () => status);
  return {
    fetchStatus,
    checker: createSessionRevocationChecker({ fetchStatus, ttlMs: 60_000, now }),
  };
}

describe('session revocation', () => {
  it('conta ativa sem revogação → válida', async () => {
    const { checker } = checkerWith({ isActive: true, sessionsRevokedAt: null });
    expect(await checker.isRevoked('u1', issuedHourAgo)).toBe(false);
  });

  it('conta inativa ou inexistente → revogada', async () => {
    const inactive = checkerWith({ isActive: false, sessionsRevokedAt: null }).checker;
    const missing = checkerWith(null).checker;
    expect(await inactive.isRevoked('u1', issuedHourAgo)).toBe(true);
    expect(await missing.isRevoked('u1', issuedHourAgo)).toBe(true);
  });

  it('token emitido antes da revogação → revogado; depois → válido', async () => {
    const revokedAt = new Date(T0 - 30 * 60_000).toISOString();
    const { checker } = checkerWith({ isActive: true, sessionsRevokedAt: revokedAt });
    expect(await checker.isRevoked('u1', issuedHourAgo)).toBe(true);
    expect(await checker.isRevoked('u1', T0 / 1000 - 60)).toBe(false);
  });

  it('cacheia por usuário durante o TTL', async () => {
    let now = T0;
    const { checker, fetchStatus } = checkerWith(
      { isActive: true, sessionsRevokedAt: null },
      () => now
    );
    await checker.isRevoked('u1', issuedHourAgo);
    await checker.isRevoked('u1', issuedHourAgo);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    now += 61_000;
    await checker.isRevoked('u1', issuedHourAgo);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });

  it('requisições simultâneas do mesmo usuário compartilham uma consulta só', async () => {
    const { checker, fetchStatus } = checkerWith({ isActive: true, sessionsRevokedAt: null });
    await Promise.all([1, 2, 3].map(() => checker.isRevoked('u1', issuedHourAgo)));
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it('erro ao consultar → não derruba a sessão e não cacheia', async () => {
    const fetchStatus = vi.fn(async (): Promise<UserStatus> => {
      throw new Error('down');
    });
    const checker = createSessionRevocationChecker({ fetchStatus, now: () => T0 });
    expect(await checker.isRevoked('u1', issuedHourAgo)).toBe(false);
    await checker.isRevoked('u1', issuedHourAgo);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });
});
