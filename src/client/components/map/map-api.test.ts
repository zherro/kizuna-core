import { describe, expect, it } from 'vitest';
import { detailFacts, formatEventStart, instagramInfo, siteInfo, telHref, whatsappHref } from './map-format';
import { distanceKm, mergePins, needsRefetch, viewRadiusKm, type MapPinRow, type MapPlaceDetail } from './map-api';
import { project } from './map-viewport';

const row = (uid: string, id: number, lat: number, lng = -56.1): MapPinRow => ({
  uid,
  address_id: id,
  title: uid,
  category_slug: null,
  category_group_slug: null,
  cover_file_id: null,
  latitude: lat,
  longitude: lng,
  venue: null,
  city: null,
  state: null,
  event_start: null,
});

describe('área e raio', () => {
  it('raio = metade da diagonal visível em km, entre 1 e 50', () => {
    const c = project({ lat: -15.6, lng: -56.1 });
    const r14 = viewRadiusKm({ w: 800, h: 600 }, { center: c, zoom: 14 });
    expect(r14).toBeGreaterThan(4.4);
    expect(r14).toBeLessThan(4.8);
    expect(viewRadiusKm({ w: 800, h: 600 }, { center: c, zoom: 19 })).toBe(1);
    expect(viewRadiusKm({ w: 800, h: 600 }, { center: c, zoom: 4 })).toBe(50);
  });

  it('distância entre dois pontos', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.2, 0);
  });

  it('refaz a busca: sem busca anterior, centro > 30% do raio ou raio maior; senão não', () => {
    const last = { lat: -15.6, lng: -56.1, radiusKm: 5 };
    expect(needsRefetch(null, last)).toBe(true);
    expect(needsRefetch(last, { ...last, lng: -56.1 + 0.01 })).toBe(false); // ~1,1 km < 1,5 km
    expect(needsRefetch(last, { ...last, lng: -56.1 + 0.02 })).toBe(true); // ~2,1 km > 1,5 km
    expect(needsRefetch(last, { ...last, radiusKm: 6 })).toBe(true);
    expect(needsRefetch(last, { ...last, radiusKm: 3 })).toBe(false);
  });
});

describe('mergePins', () => {
  const center = { lat: -15.6, lng: -56.1 };

  it('junta por uid:address_id, sem duplicar, e o mais novo vence', () => {
    const a = mergePins(new Map(), [row('u1', 1, -15.6), row('u1', 2, -15.61)], center);
    const b = mergePins(a, [{ ...row('u1', 1, -15.6), title: 'Atualizado' }, row('u2', 1, -15.62)], center);
    expect([...b.keys()].sort()).toEqual(['u1:1', 'u1:2', 'u2:1']);
    expect(b.get('u1:1')!.title).toBe('Atualizado');
    expect(a.size).toBe(2); // não muta o cache anterior
  });

  it('acima do teto descarta os mais distantes do centro', () => {
    const rows = [row('perto', 1, -15.6), row('meio', 1, -15.65), row('longe', 1, -16.5)];
    const merged = mergePins(new Map(), rows, center, 2);
    expect([...merged.keys()].sort()).toEqual(['meio:1', 'perto:1']);
  });
});

describe('formatação do detalhe', () => {
  it('data do evento', () => {
    expect(formatEventStart('2026-11-05')).toBe('05/11/2026');
    expect(formatEventStart('2026-11-05T20:30:00')).toBe('05/11/2026 às 20h30');
    expect(formatEventStart('2026-11-05 20:00')).toBe('05/11/2026 às 20h');
    expect(formatEventStart('2026-11-05T00:00:00')).toBe('05/11/2026');
    expect(formatEventStart('em breve')).toBe('em breve');
    expect(formatEventStart(null)).toBeNull();
  });

  it('links seguros de contato', () => {
    expect(telHref('(65) 3000-0000')).toBe('tel:6530000000');
    expect(telHref('ligue já')).toBeUndefined();
    expect(whatsappHref('(65) 99999-0000')).toBe('https://wa.me/5565999990000');
    expect(whatsappHref('5565999990000')).toBe('https://wa.me/5565999990000');
    expect(instagramInfo('@casa.teste')).toEqual({ label: '@casa.teste', href: 'https://instagram.com/casa.teste' });
    expect(instagramInfo('um perfil qualquer!')).toEqual({ label: 'um perfil qualquer!' });
    expect(siteInfo('exemplo.com.br')?.href).toBe('https://exemplo.com.br/');
    expect(siteInfo('javascript:alert(1)')?.href).toBeUndefined();
  });

  it('fatos: só o que tem valor; preço cai em gratuito ou valor do anúncio', () => {
    const base = { price: null, facts: null } as unknown as MapPlaceDetail;
    expect(detailFacts(base)).toEqual([]);
    const f = detailFacts({ ...base, price: 30, facts: { gratuito: true, horario: [{ texto: 'Sex, 20h' }, { texto: ' ' }] } });
    expect(f.find((x) => x.key === 'preco')?.value).toBe('Gratuito');
    expect(f.find((x) => x.key === 'horario')?.value).toEqual(['Sex, 20h']);
    expect(String(detailFacts({ ...base, price: 30 })[0].value)).toMatch(/R\$\s?30,00/);
  });
});
