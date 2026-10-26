import { describe, expect, it } from 'vitest';
import type { ServiceResult } from '../search/search-types';
import { placeItemsFromServices } from './place-mosaic-services';
import { shuffleItems } from './place-mosaic-layout';

const base: ServiceResult = {
  uid: 'u1',
  title: 'Shopping das Palmeiras',
  price: null,
  price_type: 'quote',
  category: 'Compras',
  subcategory: 'Shoppings',
  sponsored: false,
  cover_file_id: 'f1',
  provider_name: null,
  provider_avatar: null,
  rating: null,
  reviews: 0,
  city: 'Cuiabá',
  state: 'MT',
};

describe('placeItemsFromServices', () => {
  it('chapéu da subcategoria, foto cheia, cidade como apoio e link da cidade', () => {
    expect(placeItemsFromServices([base])).toEqual([
      {
        href: '/cuiaba-mt/anuncio/u1',
        title: 'Shopping das Palmeiras',
        kicker: 'Shoppings',
        image: '/api/public/storage/files/f1/content',
        meta: 'Cuiabá',
      },
    ]);
  });

  it('sem subcategoria usa a categoria; sem as duas, o chapéu padrão', () => {
    const [a, b] = placeItemsFromServices([
      { ...base, uid: 'a', subcategory: null },
      { ...base, uid: 'b', subcategory: null, category: null },
    ], { fallbackKicker: 'Lugar' });
    expect(a.kicker).toBe('Compras');
    expect(b.kicker).toBe('Lugar');
  });

  it('descarta sem título e repetidos, mantendo a ordem', () => {
    const items = placeItemsFromServices([
      { ...base, uid: 'x', title: 'X' },
      { ...base, uid: 'y', title: '  ' },
      { ...base, uid: 'x', title: 'X de novo' },
      { ...base, uid: 'z', title: 'Z', cover_file_id: null, city: null },
    ]);
    expect(items.map((i) => i.title)).toEqual(['X', 'Z']);
    expect(items[1].image).toBeNull();
    expect(items[1]).not.toHaveProperty('meta');
  });
});

describe('shuffleItems', () => {
  it('não altera a entrada e devolve os mesmos itens', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleItems(input, () => 0);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(out).not.toEqual(input);
  });
});
