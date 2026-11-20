// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdTrackingProvider, TrackedContactLink, useTrackContact } from './ad-tracking';

const UID = '0b1d5a1e-7c3e-4a9a-9d0e-2f5f6a7b8c9d';
const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  fetchMock.mockReset().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const sent = () => fetchMock.mock.calls.map((c) => JSON.parse(c[1].body as string) as Record<string, unknown>);

function CopyLike() {
  const track = useTrackContact('email');
  // usado direto como onClick: o evento do clique não pode virar canal
  return (
    <button type="button" onClick={track as unknown as () => void}>
      copiar
    </button>
  );
}

describe('canal do contact_click', () => {
  it('deduz pelo href e respeita channel explícito', () => {
    render(
      <AdTrackingProvider uid={UID}>
        <TrackedContactLink href="tel:+5565999990000">ligar</TrackedContactLink>
        <TrackedContactLink href="https://wa.me/5565999990000">zap</TrackedContactLink>
        <TrackedContactLink href="https://ingressos.exemplo.com/x" channel="purchase">
          comprar
        </TrackedContactLink>
        <CopyLike />
      </AdTrackingProvider>
    );
    for (const name of ['ligar', 'zap', 'comprar']) fireEvent.click(screen.getByText(name));
    fireEvent.click(screen.getByRole('button', { name: 'copiar' }));
    const bodies = sent();
    expect(bodies.map((b) => b.p_channel)).toEqual(['phone', 'whatsapp', 'purchase', 'email']);
    expect(bodies.every((b) => b.p_event_type === 'contact_click' && b.p_entity_id === UID)).toBe(true);
  });
});
