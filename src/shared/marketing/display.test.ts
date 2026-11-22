import { describe, expect, it } from 'vitest';
import { formatBRL } from './cost';
import { formatAmount, marketingWords, resolveMarketingDisplay, statementLabel } from './display';

describe('formatAmount', () => {
  it('brl é idêntico a formatBRL', () => {
    for (const c of [0, 1, 500, 3000, 123456, -3000, 100_000_000]) expect(formatAmount(c, 'brl')).toBe(formatBRL(c));
  });

  it('credits: inteiro sem casas, fração com vírgula, singular só em 1/-1, milhar com ponto', () => {
    expect(formatAmount(3000, 'credits')).toBe('30 créditos');
    expect(formatAmount(100, 'credits')).toBe('1 crédito');
    expect(formatAmount(-100, 'credits')).toBe('-1 crédito');
    expect(formatAmount(250, 'credits')).toBe('2,5 créditos');
    expect(formatAmount(1, 'credits')).toBe('0,01 créditos');
    expect(formatAmount(0, 'credits')).toBe('0 créditos');
    expect(formatAmount(-3000, 'credits')).toBe('-30 créditos');
    expect(formatAmount(100_000, 'credits')).toBe('1.000 créditos');
  });
});

describe('resolveMarketingDisplay', () => {
  it('sem configuração = padrão do Bora', () => {
    expect(resolveMarketingDisplay()).toEqual({ banners: true, unit: 'brl', statement: 'ledger', badgeName: 'BORA INDICA', kindLabels: {} });
  });

  it('mantém o que veio e completa o resto', () => {
    expect(resolveMarketingDisplay({ unit: 'credits', banners: false, badgeName: 'ALÔ' })).toEqual({
      banners: false,
      unit: 'credits',
      statement: 'ledger',
      badgeName: 'ALÔ',
      kindLabels: {},
    });
  });
});

describe('statementLabel', () => {
  it('rótulos padrão (os de hoje continuam iguais)', () => {
    expect(statementLabel({ kind: 'credit_admin' })).toBe('Crédito do Bora');
    expect(statementLabel({ kind: 'credit_payment' })).toBe('Pagamento');
    expect(statementLabel({ kind: 'adjust' })).toBe('Ajuste');
    expect(statementLabel({ kind: 'credit_bonus' })).toBe('Bônus');
    expect(statementLabel({ kind: 'reversal' })).toBe('Estorno');
    expect(statementLabel({ kind: 'boost_refund' })).toBe('Devolução de impulsionamento');
    expect(statementLabel({ kind: 'campaign_refund' })).toBe('Devolução de banner');
    expect(statementLabel({ kind: 'outro' })).toBe('outro');
  });

  it('impulsionamento e banner citam título/espaço e dias', () => {
    expect(statementLabel({ kind: 'boost', serviceTitle: 'Bar do Zé', days: 3 })).toBe('Impulsionou "Bar do Zé" por 3 dias');
    expect(statementLabel({ kind: 'boost', serviceTitle: null, days: 1 })).toBe('Impulsionou um anúncio por 1 dia');
    expect(statementLabel({ kind: 'campaign', slotSlug: 'home-topo', days: 7 })).toBe('Banner em home-topo por 7 dias');
  });

  it('kindLabels sobrescreve', () => {
    expect(statementLabel({ kind: 'credit_admin' }, { kindLabels: { credit_admin: 'Crédito do Alô' } })).toBe('Crédito do Alô');
    expect(statementLabel({ kind: 'boost', days: 2 }, { kindLabels: { boost: 'Destaque' } })).toBe('Destaque');
  });
});

describe('marketingWords', () => {
  it('padrão mantém os textos de hoje', () => {
    const w = marketingWords();
    expect(w.balanceAvailable).toBe('Saldo disponível');
    expect(w.addBalance).toBe('Adicionar saldo');
    expect(w.topupLead).toBe('O saldo paga impulsionamentos e banners. Dias que você parar antes do fim voltam para o saldo.');
  });

  it('créditos sem banners', () => {
    const w = marketingWords({ unit: 'credits', banners: false });
    expect(w.balanceAvailable).toBe('Créditos disponíveis');
    expect(w.addBalance).toBe('Comprar créditos');
    expect(w.topupLead).toBe('Os créditos pagam impulsionamentos. Dias que você parar antes do fim voltam para os créditos.');
    expect(w.unitHint).toBe('1 crédito = R$ 1');
  });
});
