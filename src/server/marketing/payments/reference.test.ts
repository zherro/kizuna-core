import { describe, expect, it } from 'vitest';
import { chargeKindOf, projectChargeFields } from './reference';

const boost = { kind: 'boost', serviceUid: 'u', dailyCents: 1000, startsOn: '2026-11-21', days: 3 } as const;
const campaign = { kind: 'campaign', creativeId: 'c', slotSlug: 's', dailyCents: 1000, startsOn: '2026-11-21', days: 3 } as const;

describe('projectChargeFields', () => {
  it('sem prefixo (ou prefixo inválido) não muda nada', () => {
    expect(projectChargeFields('int_1', boost, undefined)).toEqual({});
    expect(projectChargeFields('int_1', boost, { referencePrefix: '' })).toEqual({});
    expect(projectChargeFields('int_1', boost, { referencePrefix: 'bora cuiabá!' })).toEqual({});
  });

  it('impulsionamento, banner e recarga com o nome do projeto', () => {
    const cfg = { referencePrefix: 'bora', projectName: 'Bora Cuiabá' };
    expect(projectChargeFields('int_1', boost, cfg)).toEqual({
      externalRef: 'bora-impulsionamento-int_1',
      description: 'Bora Cuiabá - impulsionamento #int_1',
      metadata: { projeto: 'bora', tipo: 'impulsionamento', id: 'int_1' },
    });
    expect(projectChargeFields('int_2', campaign, cfg).externalRef).toBe('bora-banner-int_2');
    expect(projectChargeFields('int_3', null, cfg).description).toBe('Bora Cuiabá - recarga #int_3');
  });

  it('sem nome usa o prefixo na descrição', () => {
    expect(projectChargeFields('int_1', null, { referencePrefix: 'alo' }).description).toBe('alo - recarga #int_1');
  });

  it('chargeKindOf', () => {
    expect(chargeKindOf(boost)).toBe('impulsionamento');
    expect(chargeKindOf(campaign)).toBe('banner');
    expect(chargeKindOf(null)).toBe('recarga');
  });
});
