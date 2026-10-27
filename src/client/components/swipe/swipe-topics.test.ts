// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadSwipeTopics, saveSwipeTopics } from './swipe-topics';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('swipe-topics', () => {
  it('sem nada gravado devolve null', () => {
    expect(loadSwipeTopics()).toBeNull();
  });

  it('grava e lê de volta', () => {
    saveSwipeTopics(['comer', 'passear']);
    expect(loadSwipeTopics()).toEqual(['comer', 'passear']);
    expect(localStorage.getItem('kizuna:swipe:topics')).toBe('["comer","passear"]');
  });

  it('JSON inválido ou formato errado vira null', () => {
    localStorage.setItem('kizuna:swipe:topics', '{oops');
    expect(loadSwipeTopics()).toBeNull();
    localStorage.setItem('kizuna:swipe:topics', '{"a":1}');
    expect(loadSwipeTopics()).toBeNull();
    localStorage.setItem('kizuna:swipe:topics', '[]');
    expect(loadSwipeTopics()).toBeNull();
  });

  it('não lança quando o storage lança', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadSwipeTopics()).toBeNull();
    expect(() => saveSwipeTopics(['a'])).not.toThrow();
  });
});
