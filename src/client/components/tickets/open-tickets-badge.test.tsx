// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { OpenTicketsBadge } from './open-tickets-badge';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stubTotal = (total: number) => {
  const fn = vi.fn(async () => new Response(JSON.stringify({ items: [], total })));
  vi.stubGlobal('fetch', fn);
  return fn;
};

describe('OpenTicketsBadge', () => {
  it('mostra o total de chamados abertos', async () => {
    const fetchMock = stubTotal(3);
    render(<OpenTicketsBadge />);
    expect(await screen.findByText('3')).toBeTruthy();
    expect(String(fetchMock.mock.calls[0][0])).toContain('filter.status=open');
  });

  it('não mostra nada com zero', async () => {
    const fetchMock = stubTotal(0);
    const { container } = render(<OpenTicketsBadge />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
