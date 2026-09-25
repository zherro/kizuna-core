import { describe, it, expect } from 'vitest';
import { rpcAuthMode } from './rpc-auth';

describe('rpcAuthMode', () => {
  it('padrão é required', () => {
    expect(rpcAuthMode({})).toBe('required');
  });
  it('requiresAuth false sem optionalAuth é none', () => {
    expect(rpcAuthMode({ requiresAuth: false })).toBe('none');
  });
  it('requiresAuth false com optionalAuth é optional', () => {
    expect(rpcAuthMode({ requiresAuth: false, optionalAuth: true })).toBe('optional');
  });
  it('requiresAuth true ignora optionalAuth', () => {
    expect(rpcAuthMode({ requiresAuth: true, optionalAuth: true })).toBe('required');
  });
});
