import { describe, expect, it } from 'vitest';
import { parseTodaySections } from './today-config';

describe('parseTodaySections', () => {
  it('lê grupo e categoria, mantém a ordem e normaliza', () => {
    const out = parseTodaySections({
      sections: [
        { group: ' eventos ', title: 'Eventos de hoje', onlyToday: true, scope: 'region', limit: 12.7 },
        { slug: 'cinema', scope: 'bogus' },
      ],
    });
    expect(out).toEqual([
      { group: 'eventos', title: 'Eventos de hoje', limit: 12, onlyToday: true, scope: 'region' },
      { slug: 'cinema', scope: 'city' },
    ]);
  });

  it('descarta item sem slug/group e entradas inválidas', () => {
    expect(parseTodaySections({ sections: [null, 'x', {}, { title: 'a' }, { slug: '  ' }] })).toEqual([]);
    expect(parseTodaySections(undefined)).toEqual([]);
    expect(parseTodaySections({ sections: 'x' })).toEqual([]);
    expect(parseTodaySections({ sections: [{ slug: 'a', limit: -3 }] })).toEqual([{ slug: 'a', scope: 'city' }]);
  });
});
