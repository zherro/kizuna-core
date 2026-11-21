import { describe, expect, it } from 'vitest';
import { formatBRL, parseTickets } from './evento-helpers';
import { groupTickets, splitTicketGroups, ticketSector } from './ticket-groups';

const t = (o: Record<string, unknown>) => parseTickets([o])[0];

// Formato real do importador ("Simplesmente Roupa Nova", banco local): setor + tipo, e mesas com lotação.
const roupaNova = parseTickets([
  { setor: 'CAMAROTE ALLURE', valor: 12000, titulo: 'CAMAROTE ALLURE (30 pessoas)', pessoas: 30 },
  { setor: 'MESA DIAMANTE', valor: 6000, titulo: 'MESA DIAMANTE (6 pessoas)', pessoas: 6 },
  { setor: 'MESA SAFIRA', valor: 1500, titulo: 'MESA SAFIRA (6 pessoas)', pessoas: 6 },
  { tipo: 'Meia', setor: 'CAMAROTE SÃO BENEDITO', valor: 200, titulo: 'CAMAROTE SÃO BENEDITO — Meia' },
  { tipo: 'Inteira', setor: 'CAMAROTE SÃO BENEDITO', valor: 400, titulo: 'CAMAROTE SÃO BENEDITO — Inteira' },
  { tipo: 'Meia', setor: 'ÁREA PREMIUM', valor: 100, titulo: 'ÁREA PREMIUM — Meia' },
  { tipo: 'SOLIDÁRIA + 2KG DE ALIMENTO', setor: 'ÁREA PREMIUM', valor: 115, titulo: 'ÁREA PREMIUM — SOLIDÁRIA + 2KG DE ALIMENTO' },
  { tipo: 'Inteira', setor: 'ÁREA PREMIUM', valor: 200, titulo: 'ÁREA PREMIUM — Inteira' },
]);

describe('ticketSector', () => {
  it('usa o campo setor', () => {
    expect(ticketSector(t({ setor: 'PISTA', titulo: 'Qualquer' }))).toBe('PISTA');
  });

  it('sem setor, pega o prefixo do título antes de um separador explícito', () => {
    expect(ticketSector(t({ titulo: 'PISTA — Inteira' }))).toBe('PISTA');
    expect(ticketSector(t({ titulo: 'Camarote - 2º lote' }))).toBe('Camarote');
    expect(ticketSector(t({ titulo: 'Backstage: Meia' }))).toBe('Backstage');
  });

  it('sem separador não inventa setor', () => {
    expect(ticketSector(t({ titulo: 'Mesa Ouro' }))).toBeNull();
    expect(ticketSector(t({ titulo: 'Camarote para quatro' }))).toBeNull();
    expect(ticketSector(t({ tipo: 'Inteira', valor: 10 }))).toBeNull();
  });
});

describe('groupTickets', () => {
  it('agrupa por setor, do mais barato ao mais caro (grupos e linhas)', () => {
    const groups = groupTickets(roupaNova);
    expect(groups.map((g) => g.sector)).toEqual([
      'ÁREA PREMIUM',
      'CAMAROTE SÃO BENEDITO',
      'MESA SAFIRA',
      'MESA DIAMANTE',
      'CAMAROTE ALLURE',
    ]);
    expect(groups[0].rows.map((r) => [r.label, r.price])).toEqual([
      ['Meia', formatBRL(100)],
      ['SOLIDÁRIA + 2KG DE ALIMENTO', formatBRL(115)],
      ['Inteira', formatBRL(200)],
    ]);
    expect(groups[0].min).toBe(100);
  });

  it('setor de um ingresso só: linha sem rótulo próprio, com a lotação à parte', () => {
    const mesa = groupTickets(roupaNova).find((g) => g.sector === 'MESA SAFIRA')!;
    expect(mesa.rows).toHaveLength(1);
    expect(mesa.rows[0]).toMatchObject({ label: null, people: '6 pessoas', price: formatBRL(1500) });
  });

  it('mesmo setor com maiúsculas diferentes vira um grupo (nome da 1ª ocorrência)', () => {
    const groups = groupTickets(parseTickets([
      { setor: 'Pista', tipo: 'Inteira', valor: 60 },
      { setor: 'PISTA', tipo: 'Meia', valor: 30 },
    ]));
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.label)).toEqual(['Meia', 'Inteira']);
  });

  it('setor deduzido do título tira o prefixo da linha', () => {
    const groups = groupTickets(parseTickets([
      { titulo: 'PISTA — Inteira', valor: 60 },
      { titulo: 'PISTA — Meia', valor: 30 },
    ]));
    expect(groups).toHaveLength(1);
    expect(groups[0].sector).toBe('PISTA');
    expect(groups[0].rows.map((r) => r.label)).toEqual(['Meia', 'Inteira']);
  });

  it('sem setor: lista compacta, um ingresso por linha com o próprio nome', () => {
    const groups = groupTickets(parseTickets([
      { titulo: 'Inteira', valor: 60 },
      { titulo: 'Meia', valor: 30 },
      { titulo: 'Cortesia', valor: 0 },
      { titulo: 'Sob consulta' },
    ]));
    expect(groups.map((g) => [g.sector, g.rows[0].label, g.rows[0].price])).toEqual([
      [null, 'Cortesia', 'Gratuito'],
      [null, 'Meia', formatBRL(30)],
      [null, 'Inteira', formatBRL(60)],
      [null, 'Sob consulta', null],
    ]);
  });
});

describe('splitTicketGroups', () => {
  it('corta em grupos inteiros até o limite de linhas', () => {
    const { visible, hidden, hiddenCount } = splitTicketGroups(groupTickets(roupaNova), 4);
    // ÁREA PREMIUM (3) cabe; CAMAROTE SÃO BENEDITO (2) passaria de 4
    expect(visible.map((g) => g.sector)).toEqual(['ÁREA PREMIUM']);
    expect(hidden).toHaveLength(4);
    expect(hiddenCount).toBe(5);
  });

  it('o 1º grupo entra mesmo maior que o limite', () => {
    const { visible } = splitTicketGroups(groupTickets(roupaNova), 2);
    expect(visible.map((g) => g.sector)).toEqual(['ÁREA PREMIUM']);
  });

  it('sobrando só uma linha, mostra tudo', () => {
    const { visible, hidden } = splitTicketGroups(groupTickets(roupaNova), 7);
    expect(visible).toHaveLength(5);
    expect(hidden).toHaveLength(0);
  });

  it('dentro do limite, nada fica escondido', () => {
    const { hidden, hiddenCount } = splitTicketGroups(groupTickets(roupaNova), 20);
    expect(hidden).toHaveLength(0);
    expect(hiddenCount).toBe(0);
  });
});
