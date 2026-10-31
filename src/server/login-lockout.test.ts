import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetLockout,
  checkLockout,
  clearLoginFailures,
  recordLoginFailure,
} from './login-lockout';

const KEY = 'user@example.com';

beforeEach(() => {
  delete process.env.AUTH_LOCKOUT_TIERS;
  __resetLockout();
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.AUTH_LOCKOUT_TIERS;
  __resetLockout();
});

describe('login-lockout', () => {
  it('não bloqueia abaixo do primeiro tier', () => {
    for (let i = 0; i < 4; i++) recordLoginFailure(KEY);
    expect(checkLockout(KEY)).toEqual({ locked: false, retryAfterSec: 0 });
  });

  it('bloqueia ~60s ao atingir o primeiro tier (5 falhas)', () => {
    let last;
    for (let i = 0; i < 5; i++) last = recordLoginFailure(KEY);
    expect(last!.fails).toBe(5);
    const res = checkLockout(KEY);
    expect(res.locked).toBe(true);
    expect(res.retryAfterSec).toBeGreaterThan(55);
    expect(res.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('escala a janela ao atingir o segundo tier (10 falhas)', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 10; i++) recordLoginFailure(KEY);
    const res = checkLockout(KEY);
    expect(res.locked).toBe(true);
    // 5 min ~ 300s, bem acima da janela do primeiro tier
    expect(res.retryAfterSec).toBeGreaterThan(120);
    expect(res.retryAfterSec).toBeLessThanOrEqual(5 * 60);
  });

  it('clearLoginFailures zera o estado', () => {
    for (let i = 0; i < 6; i++) recordLoginFailure(KEY);
    expect(checkLockout(KEY).locked).toBe(true);
    clearLoginFailures(KEY);
    expect(checkLockout(KEY)).toEqual({ locked: false, retryAfterSec: 0 });
  });

  it('esfria o contador quando a última falha é antiga', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    expect(checkLockout(KEY).locked).toBe(true);

    // avança além da maior janela (2h)
    vi.advanceTimersByTime(2 * 60 * 60_000 + 1000);

    expect(checkLockout(KEY)).toEqual({ locked: false, retryAfterSec: 0 });
    const res = recordLoginFailure(KEY);
    expect(res.fails).toBe(1);
    expect(res.lockedUntil).toBe(0);
  });

  it('AUTH_LOCKOUT_TIERS inválida cai no default sem crashar', () => {
    process.env.AUTH_LOCKOUT_TIERS = 'not json {{{';
    __resetLockout();
    for (let i = 0; i < 5; i++) recordLoginFailure(KEY);
    const res = checkLockout(KEY);
    expect(res.locked).toBe(true);
    expect(res.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('AUTH_LOCKOUT_TIERS válida sobrescreve o default', () => {
    process.env.AUTH_LOCKOUT_TIERS = JSON.stringify([{ fails: 2, lockMs: 10_000 }]);
    __resetLockout();
    recordLoginFailure(KEY);
    expect(checkLockout(KEY).locked).toBe(false);
    recordLoginFailure(KEY);
    const res = checkLockout(KEY);
    expect(res.locked).toBe(true);
    expect(res.retryAfterSec).toBeLessThanOrEqual(10);
  });
});
