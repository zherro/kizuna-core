import { describe, expect, it } from 'vitest';
import { canAccessAiReview } from './access';

describe('canAccessAiReview', () => {
  it('sem sessão nega', () => {
    expect(canAccessAiReview(null, 'review')).toBe(false);
    expect(canAccessAiReview(undefined, 'manage')).toBe(false);
  });
  it('root passa em tudo, mas só com is_root === true', () => {
    expect(canAccessAiReview({ is_root: true }, 'manage')).toBe(true);
    expect(canAccessAiReview({ is_root: 'true' }, 'manage')).toBe(false);
    expect(canAccessAiReview({ is_root: 1 }, 'review')).toBe(false);
  });
  it('review não dá manage; manage cobre review', () => {
    const review = { perms: { ai_review: { review: true } } };
    const manage = { perms: { ai_review: { manage: true } } };
    expect(canAccessAiReview(review, 'review')).toBe(true);
    expect(canAccessAiReview(review, 'manage')).toBe(false);
    expect(canAccessAiReview(manage, 'manage')).toBe(true);
    expect(canAccessAiReview(manage, 'review')).toBe(true);
  });
  it('valores não booleanos e outros recursos não contam', () => {
    expect(canAccessAiReview({ perms: { ai_review: { review: 'true' } } }, 'review')).toBe(false);
    expect(canAccessAiReview({ perms: { ai_review: { view: true } } }, 'review')).toBe(false);
    expect(canAccessAiReview({ perms: { default: { review: true, manage: true } } }, 'manage')).toBe(false);
    expect(canAccessAiReview({ perms: null }, 'review')).toBe(false);
  });
});
