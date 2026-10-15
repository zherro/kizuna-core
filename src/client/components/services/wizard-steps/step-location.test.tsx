// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const messages = {
  wizard: {
    common: { whyLabel: 'Por que isso?', hideWhy: 'Ocultar' },
    location: {
      title: 'Onde acontece?',
      subtitle: 'Escolha o formato.',
      why: 'Por quê.',
      noCliente: 'Você vai até o endereço do interessado.',
      noEstabelecimento: 'O interessado vem até o seu endereço.',
      remoto: 'Online.',
      addressTitle: 'Endereço de referência',
      addressHint: 'O endereço exato não aparece na publicação.',
      addressSearch: 'Não sei meu CEP',
      remoteHint: 'Online pra todo o país.',
      addresses: { title: 'Endereços de atendimento', hint: 'Adicione os locais.' },
    },
  },
};
vi.mock('../../../providers/app-preferences-provider', () => ({
  useAppPreferences: () => ({ messages }),
}));
vi.mock('./address-list-editor', () => ({
  AddressListEditor: ({ labels }: { labels: { title?: string; hint?: string } }) => (
    <div data-testid="address-list">
      <span>{labels.title}</span>
      <span>{labels.hint}</span>
    </div>
  ),
}));
vi.mock('../../ui-better-soft/google-form/address-google-form', () => ({
  AddressForm: () => <div data-testid="address-form" />,
}));

import { createStepLocation } from './step-location';
import { validateLocationProfile, type LocationProfile } from './location-options';
import type { StepProfiles } from './step-profiles';
import type { ServiceWizardState } from '../service-type';
import type { WizardStepProps } from '../../wizard/types';

afterEach(cleanup);

const profiles: StepProfiles<LocationProfile> = {
  default: {
    options: [
      { value: 'no_estabelecimento', model: 'addresses' },
      { value: 'no_cliente', model: 'identifier' },
      { value: 'remoto', model: 'identifier' },
    ],
  },
  byGroup: {
    lugares: {
      options: [{ value: 'no_estabelecimento', model: 'addresses', maxAddresses: 1 }],
      labels: {
        title: 'Onde fica?',
        subtitle: 'Informe o endereço do lugar.',
        addressesTitle: 'Endereço do lugar',
        addressesHint: 'O endereço aparece na página do lugar, com mapa e rota.',
      },
    },
  },
};

const entities = {
  groups: [
    { id: 1, slug: 'servicos' },
    { id: 2, slug: 'lugares' },
  ],
  categories: [],
};

function renderStep(groupId: number, state: Partial<ServiceWizardState> = {}) {
  const Step = createStepLocation(profiles);
  const patch = vi.fn();
  render(
    <Step
      {...({
        state: { groupId, ...state } as ServiceWizardState,
        patch,
        entities,
      } as unknown as WizardStepProps<ServiceWizardState>)}
    />
  );
  return patch;
}

describe('passo location por grupo', () => {
  it('padrão: textos de evento/serviço e as 3 opções', () => {
    renderStep(1);
    expect(screen.getByText('Onde acontece?')).toBeTruthy();
    expect(screen.getByText('Você vai até o endereço do interessado.')).toBeTruthy();
  });

  it('lugares: títulos do perfil, sem "no cliente" nem grade de escolha', () => {
    renderStep(2, { serviceLocation: 'no_estabelecimento', addresses: [{} as never] });
    expect(screen.getByText('Onde fica?')).toBeTruthy();
    expect(screen.queryByText('Onde acontece?')).toBeNull();
    expect(screen.queryByText('Você vai até o endereço do interessado.')).toBeNull();
    // Opção única: nenhum botão de formato.
    expect(screen.queryByText('O interessado vem até o seu endereço.')).toBeNull();
    expect(screen.getByText('Endereço do lugar')).toBeTruthy();
    expect(
      screen.getByText('O endereço aparece na página do lugar, com mapa e rota.')
    ).toBeTruthy();
  });

  it('lugares: opção única já vem selecionada', () => {
    const patch = renderStep(2);
    expect(patch).toHaveBeenCalledWith({ serviceLocation: 'no_estabelecimento' });
  });
});

describe('validateLocationProfile labels', () => {
  it('rejeita label que não é texto', () => {
    expect(() =>
      validateLocationProfile({
        options: [{ value: 'remoto', model: 'identifier' }],
        labels: { title: 3 as unknown as string },
      })
    ).toThrow(/labels/);
  });
  it('rejeita chave de label desconhecida', () => {
    expect(() =>
      validateLocationProfile({
        options: [{ value: 'remoto', model: 'identifier' }],
        labels: { titulo: 'x' } as never,
      })
    ).toThrow(/titulo/);
  });
});
