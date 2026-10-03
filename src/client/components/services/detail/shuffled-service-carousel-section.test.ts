import { describe, expect, it } from 'vitest';
import { shuffleServices } from './shuffled-service-carousel-section';

describe('shuffleServices', () => {
  it('mantém os mesmos itens sem mutar a entrada', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleServices(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });

  it('ordem depende do random', () => {
    expect(shuffleServices([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
    expect(shuffleServices([1, 2, 3], () => 0.99)).toEqual([1, 2, 3]);
  });
});
