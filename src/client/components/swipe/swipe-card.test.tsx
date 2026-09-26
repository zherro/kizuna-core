// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SwipeCard } from './swipe-card';

afterEach(cleanup);
const item = {
  uid: 'u', title: 'T', price: null, price_type: 'quote', category: null, subcategory: null,
  sponsored: false, cover_file_id: null, provider_name: null, provider_avatar: null, rating: null, reviews: 0,
};

describe('SwipeCard local', () => {
  it('mostra cidade +extras', () => {
    render(<SwipeCard item={{ ...item, city: 'Cuiabá', state: 'MT', address_count: 3 }} />);
    expect(screen.getByText('Cuiabá +2')).toBeTruthy();
  });
  it('retrocompatível sem campos', () => {
    render(<SwipeCard item={item} />);
    expect(screen.queryByText(/\+/)).toBeNull();
  });
});
