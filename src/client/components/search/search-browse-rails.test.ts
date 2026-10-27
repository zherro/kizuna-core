import { describe, expect, it } from 'vitest';
import { interleave, normalizeBrowseRails } from './search-browse-rails';
import type { ServiceResult } from './search-types';

const item = (uid: string) => ({ uid }) as ServiceResult;

describe('normalizeBrowseRails', () => {
  it('slug vira trilha de um grupo; objeto junta grupos com título', () => {
    expect(
      normalizeBrowseRails([
        { groups: ['eventos', 'cultura-e-arte'], title: 'Eventos e cultura' },
        'cinema',
      ])
    ).toEqual([
      { groups: ['eventos', 'cultura-e-arte'], title: 'Eventos e cultura' },
      { groups: ['cinema'] },
    ]);
  });

  it('descarta itens vazios e título em branco', () => {
    expect(normalizeBrowseRails(['', { groups: [] }, { groups: [' lugares '], title: ' ' }])).toEqual([
      { groups: ['lugares'], title: undefined },
    ]);
    expect(normalizeBrowseRails(undefined)).toEqual([]);
  });
});

describe('interleave', () => {
  it('alterna os grupos, sem repetir, até o limite', () => {
    const a = [item('a1'), item('a2'), item('a3')];
    const b = [item('b1'), item('a2')];
    expect(interleave([a, b], 4).map((r) => r.uid)).toEqual(['a1', 'b1', 'a2', 'a3']);
  });

  it('um grupo só = a própria lista', () => {
    expect(interleave([[item('x'), item('y')]], 12).map((r) => r.uid)).toEqual(['x', 'y']);
  });
});
