import { describe, expect, it, vi } from 'vitest';
import { buildServiceWizardRegistry } from './build-registry';
import { SERVICE_WIZARD_STEPS } from './index';
import { resolveLocationOptions } from './step-location';
import { DEFAULT_LOCATION_PROFILE, resolveMaxAddresses } from './location-options';
import { resolvePriceProfile } from './step-price';
import { cleanPriceTable } from './price-options';
import type { LocationProfile } from './location-options';
import type { StepProfiles } from './step-profiles';
import type { ServiceWizardState } from '../service-type';
import type { WizardStepContext } from '../../wizard/types';

const entities = {
  groups: [
    { id: 'g1', slug: 'saude' },
    { id: 'g2', slug: 'casa' },
  ],
  categories: [
    { id: 'c1', slug: 'eletricista' },
    { id: 'c2', slug: 'pintor' },
  ],
};

const ctx = (
  over: Partial<ServiceWizardState> = {},
  extra: Partial<WizardStepContext<ServiceWizardState>> = {}
) =>
  ({
    state: {
      groupId: '',
      categoryId: '',
      serviceLocation: '',
      addressComplete: false,
      addresses: [],
      priceUnit: 'quote',
      startingPrice: 0,
      ...over,
    },
    entities,
    mode: 'create',
    ...extra,
  }) as unknown as WizardStepContext<ServiceWizardState>;

const base = { resource: 'services', steps: ['location', 'price'] };

describe('buildServiceWizardRegistry', () => {
  it('sem config devolve o registry padrão', () => {
    expect(buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, base)).toBe(SERVICE_WIZARD_STEPS);
  });

  it('location: default custom → modelo address exige endereço, identifier não', () => {
    const reg = buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
      ...base,
      stepProfiles: {
        location: {
          default: {
            options: [
              { value: 'no_estabelecimento', model: 'address' },
              { value: 'remoto', model: 'identifier' },
            ],
          },
        },
      },
    });
    const can = reg.location.canContinue!;
    expect(can(ctx({ serviceLocation: 'no_estabelecimento' }))).toBe(false);
    expect(can(ctx({ serviceLocation: 'no_estabelecimento', addressComplete: true }))).toBe(true);
    expect(can(ctx({ serviceLocation: 'remoto' }))).toBe(true);
    // fora das opções configuradas não libera
    expect(can(ctx({ serviceLocation: 'no_cliente' }))).toBe(false);
  });

  it('location: model addresses exige ≥1 completo e 1 principal, em qualquer modo', () => {
    const reg = buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
      ...base,
      stepProfiles: {
        location: {
          default: {
            options: [
              { value: 'no_estabelecimento', model: 'addresses', maxAddresses: 3 },
              { value: 'remoto', model: 'identifier' },
            ],
          },
        },
      },
    });
    const can = reg.location.canContinue!;
    const addr = (over = {}) => ({
      clientId: 'a',
      label: '',
      zipCode: '78000000',
      street: 'Rua A',
      number: '1',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      cityIbge: null,
      latitude: null,
      longitude: null,
      placeId: null,
      isPrimary: true,
      ...over,
    });
    const at = 'no_estabelecimento';
    expect(can(ctx({ serviceLocation: at }))).toBe(false);
    expect(can(ctx({ serviceLocation: at, addresses: [addr()] }))).toBe(true);
    expect(can(ctx({ serviceLocation: at, addresses: [addr()] }, { mode: 'edit' }))).toBe(true);
    expect(can(ctx({ serviceLocation: at, addresses: [addr()] }, { mode: 'edit' }))).toBe(true);
    expect(can(ctx({ serviceLocation: at, addresses: [], addressComplete: true }, { mode: 'edit' }))).toBe(false);
    expect(can(ctx({ serviceLocation: at, addresses: [addr({ isPrimary: false })] }))).toBe(false);
    expect(
      can(ctx({ serviceLocation: at, addresses: [addr(), addr({ clientId: 'b' })] }))
    ).toBe(false);
    expect(can(ctx({ serviceLocation: at, addresses: [addr({ street: '' })] }))).toBe(false);
    expect(can(ctx({ serviceLocation: 'remoto' }))).toBe(true);
  });

  it('location: padrão do core — só no_estabelecimento exige endereço; no_cliente/remoto não', async () => {
    const reg = buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
      ...base,
      stepProfiles: { location: { default: DEFAULT_LOCATION_PROFILE } },
    });
    const can = reg.location.canContinue!;
    expect(can(ctx({ serviceLocation: 'no_estabelecimento' }))).toBe(false);
    expect(can(ctx({ serviceLocation: 'no_cliente' }))).toBe(true);
    expect(can(ctx({ serviceLocation: 'remoto' }))).toBe(true);
    expect(DEFAULT_LOCATION_PROFILE.options.map((o) => [o.value, o.model])).toEqual([
      ['no_estabelecimento', 'addresses'],
      ['no_cliente', 'identifier'],
      ['remoto', 'identifier'],
    ]);
  });

  it('location persist: no_cliente/remoto só gravam serviceLocation e não tocam a API de endereços', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const step = buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
      ...base,
      stepProfiles: { location: { default: DEFAULT_LOCATION_PROFILE } },
    }).location;
    const saved = { clientId: 'a', isPrimary: true, id: '9' } as never;
    for (const loc of ['no_cliente', 'remoto'] as const) {
      const persist = vi.fn().mockResolvedValue({ ok: true, item: { id: 1 } });
      const patch = vi.fn();
      await step.persist!(
        ctx(
          { serviceLocation: loc, addresses: [], addressesSnapshot: [saved] },
          { persist, patch, resourceId: '1' }
        )
      );
      expect(persist).toHaveBeenCalledWith({ serviceLocation: loc });
      expect(patch).not.toHaveBeenCalled();
    }
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('validateLocationProfile: maxAddresses', () => {
    const bad = (o: object) =>
      buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
        ...base,
        stepProfiles: { location: { default: { options: [o as never] } } },
      });
    expect(() => bad({ value: 'no_cliente', model: 'addresses', maxAddresses: 11 })).toThrow(/maxAddresses/);
    expect(() => bad({ value: 'no_cliente', model: 'addresses', maxAddresses: 0 })).toThrow(/maxAddresses/);
    expect(() => bad({ value: 'no_cliente', model: 'address', maxAddresses: 2 })).toThrow(/addresses/);
    expect(() => bad({ value: 'no_cliente', model: 'addresses' })).not.toThrow();
    expect(resolveMaxAddresses({})).toBe(5);
    expect(resolveMaxAddresses({ maxAddresses: 10 })).toBe(10);
  });

  it('precedência: categoria → grupo → default custom → core (location e price)', () => {
    const locProfiles: StepProfiles<LocationProfile> = {
      default: { options: [{ value: 'no_estabelecimento', model: 'address' }] },
      byGroup: { casa: { options: [{ value: 'no_cliente', model: 'address' }] } },
      byCategory: { eletricista: { options: [{ value: 'remoto', model: 'identifier' }] } },
    };
    const values = (state: { groupId: string; categoryId: string }) =>
      resolveLocationOptions(locProfiles, entities, state).map((o) => o.value);
    expect(values({ groupId: 'g2', categoryId: 'c1' })).toEqual(['remoto']); // categoria
    expect(values({ groupId: 'g2', categoryId: 'c2' })).toEqual(['no_cliente']); // grupo
    expect(values({ groupId: 'g1', categoryId: '' })).toEqual(['no_estabelecimento']); // default
    // sem perfis: padrão do core (3 opções)
    expect(resolveLocationOptions(undefined, entities, { groupId: '', categoryId: '' })).toHaveLength(3);

    const priceProfiles = {
      default: { options: [{ value: 'day' }], priceTable: true },
      byCategory: { pintor: { options: [{ value: 'hour', textKey: 'x' }], startingPrice: false } },
    };
    expect(resolvePriceProfile(priceProfiles, entities, { groupId: 'g2', categoryId: 'c2' }).options)
      .toEqual([{ value: 'hour', textKey: 'x' }]);
    expect(resolvePriceProfile(priceProfiles, entities, { groupId: 'g2', categoryId: 'c1' }).priceTable)
      .toBe(true);
    // padrão do core: tudo + a partir de, sem tabela
    const core = resolvePriceProfile(undefined, entities, { groupId: '', categoryId: '' });
    expect(core.options.length).toBeGreaterThan(3);
    expect(core.startingPrice).toBe(true);
    expect(core.priceTable).toBe(false);
  });

  it('price: grava a tabela em extras só quando o perfil a habilita', async () => {
    const persist = vi.fn().mockResolvedValue({ ok: true, item: null });
    const persistExtras = vi.fn().mockResolvedValue({ ok: true });
    const rows = [
      {
        id: 'a',
        title: ' Entrada ',
        description: '',
        amount: 100,
        linkLabel: 'Comprar',
        linkUrl: 'https://loja.exemplo/entrada',
      },
      { id: 'b', title: '   ', description: '', amount: 5, linkLabel: '', linkUrl: '' },
      // link inválido (sem http) e sem texto: o botão é descartado, a linha fica
      { id: 'c', title: 'Camarote', description: 'Open bar', amount: 300, linkLabel: 'Ver', linkUrl: 'javascript:alert(1)' },
    ];

    const withTable = buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
      ...base,
      stepProfiles: { price: { default: { options: [{ value: 'day' }], priceTable: true } } },
    });
    await withTable.price.persist!(ctx({ priceTable: rows, priceUnit: 'day' }, { persist, persistExtras }));
    expect(persistExtras).toHaveBeenCalledWith({
      priceTable: [
        {
          id: 'a',
          title: 'Entrada',
          description: '',
          amount: 100,
          linkLabel: 'Comprar',
          toAgree: false,
          linkUrl: 'https://loja.exemplo/entrada',
        },
        { id: 'c', title: 'Camarote', description: 'Open bar', amount: 300, toAgree: false, linkLabel: '', linkUrl: '' },
      ],
    });

    persistExtras.mockClear();
    await SERVICE_WIZARD_STEPS.price.persist!(ctx({ priceTable: rows }, { persist, persistExtras }));
    expect(persistExtras).not.toHaveBeenCalled();
    expect(cleanPriceTable(rows)).toHaveLength(2);
  });

  it('perfis inválidos falham cedo', () => {
    const build = (stepProfiles: object) =>
      buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, { ...base, stepProfiles } as never);
    expect(() => build({ location: { default: { options: [] } } })).toThrow(/ao menos uma/);
    expect(() =>
      build({ location: { byGroup: { casa: { options: [{ value: 'xyz', model: 'address' }] } } } })
    ).toThrow(/value inválido/);
    expect(() => build({ price: { default: { options: [{ value: 'nope' }] } } })).toThrow(
      /value inválido/
    );
    // priceTable: campos e limite validados
    expect(() =>
      build({ price: { default: { options: [{ value: 'day' }], priceTable: { fields: ['xyz' as never] } } } })
    ).toThrow(/priceTable.fields/);
    expect(() =>
      build({ price: { default: { options: [{ value: 'day' }], priceTable: { maxRows: 0 } } } })
    ).toThrow(/maxRows/);
    // defaultValue precisa estar nas opções
    expect(() =>
      build({ price: { default: { options: [{ value: 'day' }], defaultValue: 'hour' } } })
    ).toThrow(/defaultValue/);
    expect(() =>
      build({
        location: {
          default: { options: [{ value: 'remoto', model: 'identifier' }], defaultValue: 'no_cliente' },
        },
      })
    ).toThrow(/defaultValue/);
  });

  it('price: perfil sem default exige escolher a forma de cobrança; core sempre tem uma', () => {
    const custom = buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
      ...base,
      stepProfiles: { price: { default: { options: [{ value: 'day' }, { value: 'hour' }] } } },
    });
    expect(custom.price.canContinue!(ctx({ priceUnit: '' }))).toBe(false);
    expect(custom.price.canContinue!(ctx({ priceUnit: 'day' }))).toBe(true);
    // defaultValue/defaultByCategory ficam expostos no perfil resolvido
    const withDefault = resolvePriceProfile(
      { default: { options: [{ value: 'day' }], defaultValue: 'day' } },
      entities,
      { groupId: '', categoryId: '' }
    );
    expect(withDefault.defaultValue).toBe('day');
    expect(resolvePriceProfile(undefined, entities, { groupId: '', categoryId: '' }).defaultByCategory).toBe(true);
  });

  it('skipStepsByGroup esconde qualquer passo só pro grupo listado', () => {
    const reg = buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
      ...base,
      skipStepsByGroup: { location: ['saude'], price: ['saude'] },
    });
    const enabled = reg.price.enabled as (c: WizardStepContext<ServiceWizardState>) => boolean;
    expect(enabled(ctx({ groupId: 'g1' }))).toBe(false);
    expect(enabled(ctx({ groupId: 'g2' }))).toBe(true);
    // grupo ainda não escolhido (ordem dinâmica) → o passo aparece
    expect(enabled(ctx({ groupId: '' }))).toBe(true);
    // não altera o registry original
    expect(SERVICE_WIZARD_STEPS.price.enabled).toBeUndefined();
  });

  it('skipStepsByGroup com passo desconhecido falha', () => {
    expect(() =>
      buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, { ...base, skipStepsByGroup: { nope: ['x'] } })
    ).toThrow(/fora do registry/);
  });
});
