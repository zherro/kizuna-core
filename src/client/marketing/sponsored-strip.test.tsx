// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SponsoredStrip, interleaveSponsored, pickPromoted, seededRandom, usePromotedBoosted } from './sponsored-strip';
import { __resetLiveBoosts } from './live-boosts';

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
const uid = (s: string) => s;

describe('interleaveSponsored', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('1 patrocinado a cada N itens', () => {
    expect(interleaveSponsored(items, ['S1', 'S2'], 3, uid)).toEqual(['a', 'b', 'c', 'S1', 'd', 'e', 'f', 'S2', 'g', 'h']);
  });

  it('não duplica: item comum com a mesma chave do patrocinado sai da lista', () => {
    // 'c' sai do meio da lista comum e entra uma vez, depois do 2º item comum.
    expect(interleaveSponsored(items, ['c'], 2, uid)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(interleaveSponsored(items, ['c'], 2, uid).filter((x) => x === 'c')).toHaveLength(1);
    expect(interleaveSponsored(items, ['a'], 3, uid)).toEqual(['b', 'c', 'd', 'a', 'e', 'f', 'g', 'h']);
  });

  it('sobra de patrocinados vai para o fim, nada se perde', () => {
    expect(interleaveSponsored(['a', 'b'], ['S1', 'S2'], 4, uid)).toEqual(['a', 'b', 'S1', 'S2']);
  });

  it('patrocinado repetido entra uma vez; every inválido vira 1', () => {
    expect(interleaveSponsored(['a', 'b'], ['S', 'S'], 0, uid)).toEqual(['a', 'S', 'b']);
  });

  it('sem patrocinados devolve a lista igual', () => {
    expect(interleaveSponsored(items, [], 3, uid)).toEqual(items);
  });
});

describe('pickPromoted', () => {
  const items = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }, { uid: 'd' }];
  const u = (i: { uid: string }) => i.uid;

  it('sem boost vivo nada é promovido', () => {
    const r = pickPromoted(items, new Set(), u, 3, seededRandom(1));
    expect(r.promoted).toEqual([]);
    expect(r.rest).toEqual(items);
  });

  it('promove só os vivos, até o máximo; o excedente fica no resto na posição original', () => {
    const r = pickPromoted(items, new Set(['a', 'b', 'd']), u, 2, seededRandom(7));
    expect(r.promoted).toHaveLength(2);
    expect(r.promoted.every((i) => ['a', 'b', 'd'].includes(i.uid))).toBe(true);
    expect([...r.promoted, ...r.rest].map(u).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(r.rest.map(u)).toEqual(items.map(u).filter((x) => !r.promoted.map(u).includes(x)));
  });

  it('mesma semente, mesma ordem (sorteio estável por montagem)', () => {
    const live = new Set(['a', 'b', 'c', 'd']);
    const x = pickPromoted(items, live, u, 4, seededRandom(42)).promoted.map(u);
    const y = pickPromoted(items, live, u, 4, seededRandom(42)).promoted.map(u);
    expect(x).toEqual(y);
  });
});

describe('usePromotedBoosted + SponsoredStrip', () => {
  beforeEach(() => __resetLiveBoosts());
  afterEach(() => {
    cleanup();
    __resetLiveBoosts();
    vi.unstubAllGlobals();
  });

  const results = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];

  function Probe() {
    const { promoted, rest } = usePromotedBoosted(results, (r) => r.uid, 3);
    return (
      <>
        <SponsoredStrip items={promoted} keyOf={(r) => r.uid} renderItem={(r) => <i data-testid="sp">{r.uid}</i>} />
        <ul>{rest.map((r) => <li key={r.uid} data-testid="rest">{r.uid}</li>)}</ul>
      </>
    );
  }

  it('primeiro render: lista inteira e nenhuma faixa; depois da consulta, a faixa tem só o vivo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ serviceUid: 'b' }] }) }));
    render(<Probe />);
    expect(screen.queryAllByTestId('sp')).toHaveLength(0);
    expect(screen.getAllByTestId('rest')).toHaveLength(3);
    await flush();
    expect(screen.getAllByTestId('sp').map((n) => n.textContent)).toEqual(['b']);
    expect(screen.getAllByTestId('rest').map((n) => n.textContent)).toEqual(['a', 'c']);
    expect(screen.getByRole('region', { name: 'Indicados pelo Bora' })).toBeTruthy();
  });

  it('sem impulsionamento vivo a faixa colapsa', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));
    render(<Probe />);
    await flush();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getAllByTestId('rest')).toHaveLength(3);
  });
});
