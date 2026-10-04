import { describe, expect, it } from 'vitest';
import { canAccessAiReview } from './access';

describe('canAccessAiReview', () => {
  it('sem sessão nega', () => {
    expect(canAccessAiReview(null)).toBe(false);
    expect(canAccessAiReview(undefined)).toBe(false);
  });
  it('só is_root === true estrito passa', () => {
    expect(canAccessAiReview({ is_root: true })).toBe(true);
    expect(canAccessAiReview({ is_root: 'true' })).toBe(false);
    expect(canAccessAiReview({ is_root: 1 })).toBe(false);
    expect(canAccessAiReview({ is_root: false })).toBe(false);
    expect(canAccessAiReview({})).toBe(false);
  });
  it('permissões de papel não abrem acesso', () => {
    const s = { perms: { ai_review: { manage: true, review: true } } };
    expect(canAccessAiReview(s as never)).toBe(false);
  });
});
