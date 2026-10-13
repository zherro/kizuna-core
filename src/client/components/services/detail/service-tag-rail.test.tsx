// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { loadServicesByTags } = vi.hoisted(() => ({ loadServicesByTags: vi.fn() }));
vi.mock('../../../../server/services/tag-rail-data', () => ({ loadServicesByTags }));
// o carrossel real usa embla (drag/arrows); aqui basta listar os títulos
vi.mock('./service-carousel', () => ({
  ServiceCarousel: ({ services }: { services: { uid: string; title: string }[] }) => (
    <ul>
      {services.map((s) => (
        <li key={s.uid}>{s.title}</li>
      ))}
    </ul>
  ),
}));

import { ServiceTagRail } from './service-tag-rail';

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: `u${i}`, title: `Evento ${i}` }));

beforeEach(() => loadServicesByTags.mockReset());
afterEach(cleanup);

describe('ServiceTagRail', () => {
  it('tag local:* → "Neste local", repassa exclusão e cidade ao loader', async () => {
    loadServicesByTags.mockResolvedValue({ tags: ['local:x'], items: items(3), limit: 10, hasMore: false });
    render(
      await ServiceTagRail({ tags: ['local:x'], excludeUid: 'self', cityIbge: '5103403', shuffle: false })
    );

    expect(screen.getByRole('heading', { name: 'Neste local' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(loadServicesByTags).toHaveBeenCalledWith(
      ['local:x'],
      expect.objectContaining({ excludeUid: 'self', cityIbge: '5103403' })
    );
  });

  it('demais tags → "Mais em <tag>"; título explícito vence; corta em limit', async () => {
    loadServicesByTags.mockResolvedValue({ tags: ['shoppings'], items: items(5), limit: 2, hasMore: true });
    render(await ServiceTagRail({ tags: ['shoppings'], shuffle: false }));
    expect(screen.getByRole('heading', { name: 'Mais em Shoppings' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    cleanup();

    render(await ServiceTagRail({ tags: ['shoppings'], title: 'Lojas', shuffle: false }));
    expect(screen.getByRole('heading', { name: 'Lojas' })).toBeTruthy();
  });

  it('embaralhado (default) mostra no máximo limit', async () => {
    loadServicesByTags.mockResolvedValue({ tags: ['a'], items: items(6), limit: 4, hasMore: true });
    render(await ServiceTagRail({ tags: ['a'] }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('sem itens some (null)', async () => {
    loadServicesByTags.mockResolvedValue(null);
    expect(await ServiceTagRail({ tags: ['a'] })).toBeNull();
  });
});
