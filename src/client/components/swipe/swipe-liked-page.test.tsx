// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const api = vi.hoisted(() => ({
  fetchLiked: vi.fn(async () => [
    { uid: 'u1', title: 'Pintor', price: null, price_type: 'quote', category: 'Casa', cover_file_id: null, liked_at: '2026-09-25' },
  ]),
  recordSwipe: vi.fn(async () => {}),
}));
vi.mock('./swipe-api', () => api);
vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));

import { SwipeLikedPage } from './swipe-liked-page';

afterEach(() => cleanup());

describe('SwipeLikedPage', () => {
  it('lista e descurte', async () => {
    render(<SwipeLikedPage />);
    expect(await screen.findByText('Pintor')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Descurtir Pintor'));
    expect(api.recordSwipe).toHaveBeenCalledWith(['u1'], 'skip');
    await waitFor(() => expect(screen.queryByText('Pintor')).toBeNull());
  });
});
