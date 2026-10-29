import { describe, it, expect } from 'vitest';
import {
  eventDateParts,
  eventDayFromExpiresAt,
  eventEndTimeFromExpiresAt,
  formatEventExpiry,
  eventEnd,
  eventPriceInfo,
  eventPlaceMapUrl,
  resolveEventPlace,
  eventoHeaderTags,
  formatBRL,
  formatEventDay,
  formatEventTime,
  formatEventWhen,
  isEventOver,
  mapsSearchUrl,
  nowLocalString,
  parseLocalDate,
  parseNames,
  parseSalePoints,
  eventCityFromAddress,
  parseSessionDays,
  parseTickets,
  ticketDisplay,
  safeHttpUrl,
  splitEventAddress,
  whatsappHref,
} from './evento-helpers';

const flat = (s: string | null) => s?.replace(/\s/g, ' ');

describe('datas locais', () => {
  it('parseLocalDate lê data e data+hora; rejeita lixo', () => {
    expect(parseLocalDate('2026-11-14')).toEqual({ y: 2026, m: 11, d: 14, hh: null, mm: null });
    expect(parseLocalDate('2026-11-14T20:30')).toEqual({ y: 2026, m: 11, d: 14, hh: 20, mm: 30 });
    expect(parseLocalDate('14/11/2026')).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate('2026-13-01')).toBeNull();
  });

  it('não desloca o dia (virada de fuso)', () => {
    expect(eventDateParts('2026-11-01')).toEqual({ day: '01', month: 'nov' });
    expect(eventDateParts('2026-01-01T00:00')).toEqual({ day: '01', month: 'jan' });
    expect(formatEventDay('2026-11-14')).toMatch(/14 de nov/);
  });

  it('formatEventTime', () => {
    expect(formatEventTime('9:05')).toBe('09:05');
    expect(formatEventTime('20:00:00')).toBe('20:00');
    expect(formatEventTime('25:00')).toBeNull();
  });

  it('formatEventWhen: mesmo dia, outro dia, só data', () => {
    expect(formatEventWhen({ data_inicio: '2026-11-14T20:00' })).toMatch(/14 de nov.* · 20:00$/);
    expect(formatEventWhen({ data_inicio: '2026-11-14T20:00', data_fim: '2026-11-14T23:30' })).toMatch(
      /20:00 às 23:30$/
    );
    expect(formatEventWhen({ data_inicio: '2026-11-14T20:00', data_fim: '2026-11-15T02:00' })).toMatch(
      /até .*15 de nov/
    );
    expect(formatEventWhen({ data_inicio: '2026-11-14' })).not.toMatch(/·/);
    expect(formatEventWhen({})).toBeNull();
  });
});

describe('sessões', () => {
  it('agrupa por dia, ordena e cai em data_inicio sem data', () => {
    const days = parseSessionDays(
      [
        { data: '2026-11-15', hora_inicio: '20:00' },
        { data: '2026-11-14', hora_inicio: '21:00', hora_fim: '23:00', abertura_portoes: '19:00' },
        { data: '2026-11-14', hora_inicio: '15:00' },
        { hora_inicio: '10:00' },
        'lixo',
      ],
      '2026-11-13T10:00'
    );
    expect(days.map((d) => d.date)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15']);
    expect(days[1].times.map((t) => t.inicio)).toEqual(['15:00', '21:00']);
    expect(days[1].times[1]).toEqual({ abertura: '19:00', inicio: '21:00', fim: '23:00' });
  });

  it('vazio ou inválido vira lista vazia', () => {
    expect(parseSessionDays(undefined)).toEqual([]);
    expect(parseSessionDays({})).toEqual([]);
  });
});

describe('ingressos e preço', () => {
  it('parseTickets ordena do maior para o menor valor (sem valor por último)', () => {
    const t = parseTickets([
      { titulo: 'Meia', valor: 80 },
      { titulo: 'Sem valor', setor: 'X' },
      { titulo: 'Camarote', valor: 1600 },
      { titulo: 'Inteira', valor: 160 },
    ]);
    expect(t.map((x) => x.titulo)).toEqual(['Camarote', 'Inteira', 'Meia', 'Sem valor']);
  });

  it('parseTickets descarta vazios e normaliza', () => {
    const t = parseTickets([{ titulo: 'Pista', setor: 'A', valor: 50, pessoas: 1 }, {}, null, { valor: 'x' }]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ titulo: 'Pista', setor: 'A', valor: 50, pessoas: 1, lote: null });
  });

  it('eventPriceInfo', () => {
    expect(eventPriceInfo({ free: true, startingPrice: 50 })).toMatchObject({ kind: 'free', amount: 'Gratuito' });
    const from = eventPriceInfo({ startingPrice: 80, priceUnit: 'event' });
    expect(from.kind).toBe('from');
    expect(flat(from.amount)).toBe('R$ 80,00');
    expect(from.caption).toBe('A partir de');
    expect(eventPriceInfo({ startingPrice: 0, priceUnit: 'quote' }).amount).toBe('Sob consulta');
    const tick = eventPriceInfo({
      startingPrice: 0,
      tickets: parseTickets([
        { titulo: 'a', valor: 120 },
        { titulo: 'b', valor: 60 },
        { titulo: 'c', valor: 0 },
      ]),
    });
    expect(flat(tick.amount)).toBe('R$ 60,00');
    expect(flat(formatBRL(1234.5))).toBe('R$ 1.234,50');
  });
});

describe('encerrado', () => {
  const now = new Date('2026-11-14T23:00:00Z').getTime(); // 20:00 em São Paulo

  it('nowLocalString usa America/Sao_Paulo', () => {
    expect(nowLocalString(now)).toBe('2026-11-14T20:00');
  });

  it('data sem hora vale até o fim do dia', () => {
    expect(isEventOver({ data_inicio: '2026-11-14' }, null, now)).toBe(false);
    expect(isEventOver({ data_inicio: '2026-11-13' }, null, now)).toBe(true);
  });

  it('usa data_fim e sessões', () => {
    expect(isEventOver({ data_inicio: '2026-11-14T10:00', data_fim: '2026-11-14T19:00' }, null, now)).toBe(true);
    const sessoes = [{ data: '2026-11-14', hora_fim: '22:00' }];
    expect(isEventOver({ data_inicio: '2026-11-10', sessoes }, null, now)).toBe(false);
    expect(eventEnd({ data_inicio: '2026-11-10', sessoes })).toBe('2026-11-14T22:00');
  });

  it('sem datas cai em expiresAt', () => {
    expect(isEventOver({}, '2026-11-01T00:00:00Z', now)).toBe(true);
    expect(isEventOver({}, '2026-12-01T00:00:00Z', now)).toBe(false);
    expect(isEventOver({}, null, now)).toBe(false);
  });

  it('expiresAt (Acontece em) manda sobre as datas do formulário', () => {
    // formulário diz que já passou, mas o "Acontece em" ainda não venceu
    expect(isEventOver({ data_inicio: '2026-11-01' }, '2026-11-15T02:59:59.999Z', now)).toBe(false);
    // e o contrário: formulário no futuro, "Acontece em" vencido
    expect(isEventOver({ data_inicio: '2026-12-01' }, '2026-11-01T02:59:59.999Z', now)).toBe(true);
  });
});

describe('eventDayFromExpiresAt', () => {
  it('fim do dia em Cuiabá continua sendo o mesmo dia', () => {
    // 23:59:59.999 em Cuiabá (UTC-4) = 03:59:59.999Z do dia seguinte
    expect(eventDayFromExpiresAt('2026-11-15T03:59:59.999Z')).toBe('2026-11-14');
    expect(eventDayFromExpiresAt('2026-11-14T12:00:00Z')).toBe('2026-11-14');
    // outro fuso, quando o projeto pedir
    expect(eventDayFromExpiresAt('2026-11-15T02:59:59.999Z', 'America/Sao_Paulo')).toBe('2026-11-14');
  });
  it('sem validade ou valor inválido → null', () => {
    expect(eventDayFromExpiresAt(null)).toBeNull();
    expect(eventDayFromExpiresAt('')).toBeNull();
    expect(eventDayFromExpiresAt('lixo')).toBeNull();
  });
});

describe('tags e links', () => {
  it('eventoHeaderTags', () => {
    expect(eventoHeaderTags({ answers: { classificacao_indicativa: '14 anos', gratuito: true } })).toEqual([
      '14 anos',
      'Gratuito',
    ]);
    expect(eventoHeaderTags({ answers: {} })).toEqual([]);
    expect(eventoHeaderTags(null)).toEqual([]);
  });

  it('parseSalePoints: objeto {nome, link}, string pura, link inválido e itens sem nome', () => {
    expect(
      parseSalePoints([
        { nome: ' Disk ingresso ', link: 'https://disk.test/e' },
        { nome: 'casa-x', link: 'javascript:alert(1)' },
        { nome: 'Sem link' },
        'Bilheteria',
        { link: 'https://x.test' },
        '  ',
        null,
      ])
    ).toEqual([
      { nome: 'Disk ingresso', link: 'https://disk.test/e' },
      { nome: 'casa-x', link: null },
      { nome: 'Sem link', link: null },
      { nome: 'Bilheteria', link: null },
    ]);
    expect(parseSalePoints(undefined)).toEqual([]);
  });

  it('eventCityFromAddress: trecho final "Cidade/UF"', () => {
    expect(eventCityFromAddress('Teatro Y — Rua B, 5, Centro, Cuiabá/MT')).toBe('Cuiabá/MT');
    expect(eventCityFromAddress('Casa — Av. A, 1, Várzea Grande / mt')).toBe('Várzea Grande/MT');
    expect(eventCityFromAddress('Teatro Y — Rua B, 5, Centro')).toBeNull();
    expect(eventCityFromAddress('Cuiabá/MT')).toBe('Cuiabá/MT');
    expect(eventCityFromAddress(undefined)).toBeNull();
  });

  it('parseNames', () => {
    expect(parseNames([{ nome: 'A' }, { nome: ' ' }, {}, { nome: 'B' }])).toEqual(['A', 'B']);
  });

  it('endereço, mapa e contato', () => {
    expect(splitEventAddress('Arena — Rua X, Centro, Cuiabá/MT')).toEqual({
      name: 'Arena',
      rest: 'Rua X, Centro, Cuiabá/MT',
    });
    expect(splitEventAddress('Praça')).toEqual({ name: 'Praça', rest: null });
    expect(mapsSearchUrl('Arena Rua X')).toBe('https://www.google.com/maps/search/?api=1&query=Arena%20Rua%20X');
    expect(whatsappHref('(65) 99999-0000')).toBe('https://wa.me/5565999990000');
    expect(whatsappHref('+55 65 99999-0000')).toBe('https://wa.me/5565999990000');
  });

  it('safeHttpUrl bloqueia esquemas perigosos', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('https://x.com/a')).toBe('https://x.com/a');
    expect(safeHttpUrl('x.com')).toBeNull();
  });
});

describe('ticketDisplay', () => {
  const base = { titulo: null, setor: null, tipo: null, lote: null, pessoas: null, valor: null, comprar: null };

  it('título do importador: nome = setor, detalhe sem setor nem lotação, lotação vira etiqueta', () => {
    expect(
      ticketDisplay({
        ...base,
        setor: 'CAMAROTE PALCO',
        titulo: 'CAMAROTE PALCO — 10 copos + 01 Whisky OldPar (10 pessoas)',
        pessoas: 10,
      })
    ).toEqual({ name: 'CAMAROTE PALCO', detail: '10 copos + 01 Whisky OldPar', lote: null, people: '10 pessoas' });
  });

  it('usa o tipo como detalhe e não repete a lotação que já está nele', () => {
    expect(
      ticketDisplay({ ...base, setor: 'CAMAROTE', tipo: '10 pessoas + 10 copos', pessoas: 10, lote: '1º lote' })
    ).toEqual({ name: 'CAMAROTE', detail: '10 pessoas + 10 copos', lote: '1º lote', people: null });
  });

  it('só setor e lotação: sem detalhe', () => {
    expect(ticketDisplay({ ...base, setor: 'BISTRO', titulo: 'BISTRO (5 pessoas)', pessoas: 5 })).toEqual({
      name: 'BISTRO',
      detail: null,
      lote: null,
      people: '5 pessoas',
    });
  });

  it('setor no começo sem separador faz parte do texto', () => {
    expect(
      ticketDisplay({ ...base, setor: 'CAMAROTE', titulo: 'Camarote para quatro pessoas com serviço de bar', pessoas: 4 })
        .detail
    ).toBe('Camarote para quatro pessoas com serviço de bar');
  });

  it('sem setor cai no título', () => {
    expect(ticketDisplay({ ...base, titulo: 'Meia-entrada' })).toEqual({ name: 'Meia-entrada', detail: null, lote: null, people: null });
  });
});

describe('resolveEventPlace', () => {
  const loc = { address: 'Av. Beira Rio, 4453, Terceiro, Cuiabá - MT', lat: -15.6, lng: -56.1, label: 'Musiva' };
  it('lugar vinculado tem prioridade', () => {
    expect(resolveEventPlace({ title: 'Musiva', address: 'Rua X' }, loc, 'Velho')).toMatchObject({ name: 'Musiva', rest: 'Rua X' });
  });
  it('sem lugar, usa o endereço do passo (apelido como nome) e as coordenadas', () => {
    const p = resolveEventPlace(null, loc, 'Velho')!;
    expect(p).toMatchObject({ name: 'Musiva', rest: loc.address, lat: -15.6 });
    expect(eventPlaceMapUrl(p)).toContain(encodeURIComponent('-15.6,-56.1'));
  });
  it('sem endereço do passo, cai no campo antigo do formulário', () => {
    expect(resolveEventPlace(null, null, 'Casa — Rua A, Cuiabá/MT')).toMatchObject({ name: 'Casa', rest: 'Rua A, Cuiabá/MT' });
    expect(resolveEventPlace(null, { ...loc, address: ' ' }, '')).toBeNull();
  });
});

describe('eventEndTimeFromExpiresAt / formatEventExpiry', () => {
  it('lê a hora no fuso de Cuiabá (UTC-4)', () => {
    expect(eventEndTimeFromExpiresAt('2026-11-15T03:00:00.000Z')).toBe('23:00'); // 14/11 23:00 em Cuiabá
    expect(eventEndTimeFromExpiresAt('2026-11-14T22:30:00Z')).toBe('18:30');
    expect(eventEndTimeFromExpiresAt('2026-11-14T22:30:00Z', 'America/Sao_Paulo')).toBe('19:30');
  });
  it('fim do dia (23:59:59) e valores inválidos → null', () => {
    expect(eventEndTimeFromExpiresAt('2026-11-15T03:59:59.999Z')).toBeNull();
    expect(eventEndTimeFromExpiresAt(null)).toBeNull();
    expect(eventEndTimeFromExpiresAt('lixo')).toBeNull();
  });
  it('formatEventExpiry: dia, com "até HH:MM" só quando há hora', () => {
    expect(formatEventExpiry('2026-11-15T03:59:59.999Z')).toMatch(/14 de nov\.?$/);
    expect(formatEventExpiry('2026-11-15T03:00:00.000Z')).toMatch(/14 de nov.* · até 23:00$/);
    expect(formatEventExpiry(null)).toBeNull();
  });
});
