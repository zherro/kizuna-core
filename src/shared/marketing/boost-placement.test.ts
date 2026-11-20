import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOOST_PLACEMENT,
  isSponsored,
  parseBoostPlacementConfig,
  pickSponsored,
  pinSponsored,
  sponsoredMaxParam,
} from './boost-placement';
import { seededRandom } from '../../client/marketing/sponsored-strip';

type Item = { uid: string; sponsor_slot?: number | null };
const it_ = (uid: string, slot?: number | null): Item => ({ uid, sponsor_slot: slot ?? null });
const uids = (xs: Item[]) => xs.map((x) => x.uid);

describe('parseBoostPlacementConfig', () => {
  it('sem config usa os padrões', () => {
    expect(parseBoostPlacementConfig(undefined)).toEqual(DEFAULT_BOOST_PLACEMENT);
  });

  it('corta em 0..10, ignora inválidos e garante railPool >= railSlots', () => {
    const c = parseBoostPlacementConfig({ searchSlots: 99, railSlots: 4, railPool: 1, listSlots: -3, enabled: true });
    expect(c).toMatchObject({ searchSlots: 10, railSlots: 4, railPool: 4, listSlots: 0, enabled: true });
    expect(parseBoostPlacementConfig({ searchSlots: 'x' }).searchSlots).toBe(DEFAULT_BOOST_PLACEMENT.searchSlots);
  });

  it('enabled:false não manda p_sponsored_max (comportamento antigo)', () => {
    const off = parseBoostPlacementConfig({ enabled: false });
    expect(sponsoredMaxParam(off, 2)).toBeUndefined();
    expect(sponsoredMaxParam(DEFAULT_BOOST_PLACEMENT, 2)).toBe(2);
    expect(sponsoredMaxParam(DEFAULT_BOOST_PLACEMENT, 50)).toBe(10);
  });
});

describe('pinSponsored', () => {
  it('vaga patrocinada na frente, na ordem da vaga; o resto na ordem original e nada se perde', () => {
    const out = pinSponsored([it_('a'), it_('p2', 2), it_('b'), it_('p1', 1), it_('c')]);
    expect(uids(out)).toEqual(['p1', 'p2', 'a', 'b', 'c']);
  });

  it('sem patrocinado devolve a mesma ordem', () => {
    expect(uids(pinSponsored([it_('a'), it_('b')]))).toEqual(['a', 'b']);
  });
});

describe('pickSponsored (limite e rodízio)', () => {
  const pool = [it_('a'), it_('p1', 1), it_('p2', 2), it_('b'), it_('p3', 3), it_('c')];

  it('sem sorteio: as primeiras vagas (mesmo HTML no servidor e na hidratação)', () => {
    const { pinned, rest } = pickSponsored(pool, 1);
    expect(uids(pinned)).toEqual(['p1']);
    // não escolhidos perdem a vaga e vão para o FIM (não ganham a frente de graça)
    expect(uids(rest)).toEqual(['a', 'b', 'c', 'p2', 'p3']);
    expect(rest.filter(isSponsored)).toHaveLength(0);
  });

  it('respeita o limite por lista', () => {
    expect(pickSponsored(pool, 2).pinned).toHaveLength(2);
    expect(pickSponsored(pool, 0).pinned).toHaveLength(0);
    expect(pickSponsored(pool, 10).pinned).toHaveLength(3);
  });

  it('rodízio: sementes diferentes mostram impulsionados diferentes, todos com chance', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) seen.add(pickSponsored(pool, 1, seededRandom(seed)).pinned[0].uid);
    expect([...seen].sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('o escolhido é renumerado a partir de 1 e o total de itens não muda', () => {
    const { pinned, rest } = pickSponsored(pool, 2, seededRandom(7));
    expect(pinned.map((p) => p.sponsor_slot)).toEqual([1, 2]);
    expect(pinned.length + rest.length).toBe(pool.length);
  });
});
