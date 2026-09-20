'use client';

import { useState } from 'react';
import { useAppPreferences } from '../../../providers/app-preferences-provider';
import { Building2, Home, Wifi } from 'lucide-react';
import {
  AddressForm,
  type AddressValue,
} from '../../ui-better-soft/google-form/address-google-form';
import type { WizardStepProps } from '../../wizard/types';
import { SERVICE_LOCATION_LABEL, type ServiceWizardState } from '../service-type';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

const OPTIONS: {
  value: keyof typeof SERVICE_LOCATION_LABEL;
  icon: typeof Home;
  descKey: 'noCliente' | 'noEstabelecimento' | 'remoto';
}[] = [
  { value: 'no_cliente', icon: Home, descKey: 'noCliente' },
  { value: 'no_estabelecimento', icon: Building2, descKey: 'noEstabelecimento' },
  { value: 'remoto', icon: Wifi, descKey: 'remoto' },
];

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

/**
 * Passo 3 — tipo de atendimento. Só `serviceLocation` é persistido; o endereço detalhado abaixo
 * é local (posiciona a UX, não vira coluna) — mesmo comportamento do wizard antigo.
 */
export function StepLocation({ state, patch }: WizardStepProps<ServiceWizardState>) {
  const value = state.serviceLocation ?? '';
  const { messages } = useAppPreferences();
  const t = messages.wizard;
  const [address, setAddress] = useState<AddressValue>(initialAddress);
  const isPresential = value === 'no_cliente' || value === 'no_estabelecimento';

  // O endereço em si continua local-only (não vira coluna — ver comentário da função), mas o
  // "completo?" precisa chegar no estado do wizard pra `canContinue` poder exigir o preenchimento
  // antes de liberar o avanço (senão o auto-reveal do layout "Questionário" avançava assim que a
  // opção presencial era escolhida, sem o usuário sequer ter visto o formulário de endereço).
  const handleAddressChange = (next: AddressValue) => {
    setAddress(next);
    const complete = Boolean(next.postalCode.trim() && next.street.trim() && next.number.trim());
    patch({ addressComplete: complete });
  };

  return (
    <div className="space-y-6">
      <StepHeader
        title={t.location.title}
        subtitle={t.location.subtitle}
        why={t.location.why}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = value === option.value;
          const Icon = option.icon;
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
                {SERVICE_LOCATION_LABEL[option.value]}
              </div>
              <div className="text-xs text-muted-foreground">{t.location[option.descKey]}</div>
            </button>
          );
        })}
      </div>

      {isPresential ? (
        <div className="space-y-3 border-t border-border pt-6">
          <div>
            <p className="text-sm font-semibold text-foreground">{t.location.addressTitle}</p>
            <p className="text-sm text-muted-foreground">
              {t.location.addressHint}
            </p>
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

      {value === 'remoto' ? (
        <StepHint tone="info">
          {t.location.remoteHint}
        </StepHint>
      ) : null}
    </div>
  );
}
