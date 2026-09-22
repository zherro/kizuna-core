'use client';

import { useEffect, useState } from 'react';
import { useAppPreferences } from '../../../providers/app-preferences-provider';
import { Building2, Home, Wifi, type LucideIcon } from 'lucide-react';
import { resolveLucideIcon } from '../../../../lib/lucide-icon';
import {
  AddressForm,
  type AddressValue,
} from '../../ui-better-soft/google-form/address-google-form';
import type { WizardEntities, WizardStep, WizardStepProps } from '../../wizard/types';
import {
  SERVICE_LOCATION_LABEL,
  type ServiceWizardState,
} from '../service-type';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';
import {
  DEFAULT_LOCATION_PROFILE,
  type LocationOptionConfig,
  type LocationProfile,
  type ServiceLocationValue,
} from './location-options';
import { resolveStepProfile, type StepProfiles } from './step-profiles';

const DEFAULT_ICON: Record<ServiceLocationValue, LucideIcon> = {
  no_cliente: Home,
  no_estabelecimento: Building2,
  remoto: Wifi,
};

const DEFAULT_DESC_KEY: Record<
  ServiceLocationValue,
  'noCliente' | 'noEstabelecimento' | 'remoto'
> = {
  no_cliente: 'noCliente',
  no_estabelecimento: 'noEstabelecimento',
  remoto: 'remoto',
};

const initialAddress: AddressValue = {
  postalCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country: 'BR',
  latitude: null,
  longitude: null,
  placeId: null,
  formattedAddress: null,
};

type LocationOptionMessages = Record<
  string,
  { title?: string; description?: string; hint?: string } | undefined
>;

/** Perfil que vale agora: categoria → grupo → custom global → padrão do core. */
export function resolveLocationProfile(
  profiles: StepProfiles<LocationProfile> | undefined,
  entities: WizardEntities,
  state: Pick<ServiceWizardState, 'groupId' | 'categoryId'>
): LocationProfile {
  return resolveStepProfile(DEFAULT_LOCATION_PROFILE, profiles, entities, state);
}

export function resolveLocationOptions(
  profiles: StepProfiles<LocationProfile> | undefined,
  entities: WizardEntities,
  state: Pick<ServiceWizardState, 'groupId' | 'categoryId'>
): LocationOptionConfig[] {
  return resolveLocationProfile(profiles, entities, state).options;
}

/**
 * Passo 3 — tipo de atendimento. Só `serviceLocation` é persistido; o endereço detalhado abaixo
 * é local (posiciona a UX, não vira coluna) — mesmo comportamento do wizard antigo.
 *
 * As opções vêm do perfil da config (`stepProfiles.location`): cada uma grava um valor do enum e escolhe o
 * modelo — `address` (formulário de endereço) ou `identifier` (só o identificador, ex.: online).
 * Título/descrição/dica de cada opção vêm de `messages.wizard.location.options[value]`, com
 * fallback nos textos padrão.
 */
export function createStepLocation(profiles?: StepProfiles<LocationProfile>) {
  return function StepLocation({ state, patch, entities }: WizardStepProps<ServiceWizardState>) {
    const { options, defaultValue } = resolveLocationProfile(profiles, entities, state);
    const value = state.serviceLocation ?? '';
    const { messages } = useAppPreferences();
    const t = messages.wizard;
    const optionMessages = (t.location as { options?: LocationOptionMessages }).options ?? {};
    const [address, setAddress] = useState<AddressValue>(initialAddress);
    const selected = options.find((option) => option.value === value);

    // Perfil com `defaultValue` e nada escolhido ainda → já abre com ele selecionado. Sem
    // `defaultValue`, nada vem selecionado.
    useEffect(() => {
      if (!value && defaultValue && options.some((option) => option.value === defaultValue)) {
        patch({ serviceLocation: defaultValue });
      }
    }, [value, defaultValue, options, patch]);

    // Trocou de grupo e a opção antes escolhida não existe mais nas opções do novo → limpa, pra
    // não gravar um valor que a tela não oferece.
    useEffect(() => {
      if (value && !options.some((option) => option.value === value)) {
        patch({ serviceLocation: '' });
      }
    }, [value, options, patch]);

    // O endereço em si continua local-only (não vira coluna — ver comentário da função), mas o
    // "completo?" precisa chegar no estado do wizard pra `canContinue` poder exigir o
    // preenchimento antes de liberar o avanço (senão o auto-reveal do layout "Questionário"
    // avançava assim que a opção presencial era escolhida, sem o usuário ter visto o endereço).
    const handleAddressChange = (next: AddressValue) => {
      setAddress(next);
      const complete = Boolean(next.postalCode.trim() && next.street.trim() && next.number.trim());
      patch({ addressComplete: complete });
    };

    const selectedHint = selected
      ? (optionMessages[selected.textKey ?? selected.value]?.hint ??
        (selected.model === 'identifier' ? t.location.remoteHint : undefined))
      : undefined;

    return (
      <div className="space-y-6">
        <StepHeader title={t.location.title} subtitle={t.location.subtitle} why={t.location.why} />

        <div
          className={`grid grid-cols-1 gap-3 ${options.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}
        >
          {options.map((option) => {
            const active = value === option.value;
            const Icon = resolveLucideIcon(option.icon) ?? DEFAULT_ICON[option.value];
            const custom = optionMessages[option.textKey ?? option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => patch({ serviceLocation: option.value })}
                data-active={active}
                className="wz-selectable flex flex-col items-start gap-2 rounded-xl border bg-background p-4 text-left"
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {custom?.title ?? SERVICE_LOCATION_LABEL[option.value]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {custom?.description ?? t.location[DEFAULT_DESC_KEY[option.value]]}
                </div>
              </button>
            );
          })}
        </div>

        {selected?.model === 'address' ? (
          <div className="space-y-3 border-t border-border pt-6">
            <div>
              <p className="text-sm font-semibold text-foreground">{t.location.addressTitle}</p>
              <p className="text-sm text-muted-foreground">{t.location.addressHint}</p>
            </div>
            <AddressForm
              value={address}
              onChange={handleAddressChange}
              features={{ search: true, modalSearch: true, locationSelection: false, map: false }}
              layout="compact"
              searchLabel={t.location.addressSearch}
            />
          </div>
        ) : null}

        {selected?.model === 'identifier' && selectedHint ? (
          <StepHint tone="info">{selectedHint}</StepHint>
        ) : null}
      </div>
    );
  };
}

/** Passo `location` pronto pro registry, com os perfis dados (padrão: as 3 opções do core). */
export function createLocationStep(
  profiles?: StepProfiles<LocationProfile>
): WizardStep<ServiceWizardState> {
  return {
    key: 'location',
    label: 'Onde você atende',
    Component: createStepLocation(profiles),
    // Opção de modelo `address` exige o endereço de referência preenchido — só em `create`: em
    // `edit`/`review` o endereço nunca foi persistido (é local-only), então barrar aqui só
    // travaria quem está editando outra coisa no anúncio.
    canContinue: (ctx) => {
      const loc = ctx.state.serviceLocation;
      if (!loc) return false;
      const options = resolveLocationOptions(profiles, ctx.entities, ctx.state);
      const option = options.find((o) => o.value === loc);
      if (!option) return false;
      if (option.model !== 'address' || ctx.mode !== 'create') return true;
      return Boolean(ctx.state.addressComplete);
    },
    persist: async (ctx) => {
      await ctx.persist({ serviceLocation: ctx.state.serviceLocation });
    },
  };
}

/** Componente padrão (mantido pra quem importa `StepLocation` direto). */
export const StepLocation = createStepLocation();
