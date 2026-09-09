'use client';

import { useState } from 'react';
import { Building2, Home, Wifi } from 'lucide-react';
import {
  AddressForm,
  type AddressValue,
} from '../../ui-better-soft/google-form/address-google-form';
import type { WizardStepProps } from '../../wizard/types';
import { SERVICE_LOCATION_LABEL, type ServiceWizardState } from '../service-type';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

const OPTIONS: { value: keyof typeof SERVICE_LOCATION_LABEL; icon: typeof Home; desc: string }[] = [
  { value: 'no_cliente', icon: Home, desc: 'Você vai até o endereço do cliente.' },
  { value: 'no_estabelecimento', icon: Building2, desc: 'O cliente vai até o seu endereço.' },
  { value: 'remoto', icon: Wifi, desc: 'O serviço é feito à distância, sem atendimento presencial.' },
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
  const [address, setAddress] = useState<AddressValue>(initialAddress);
  const isPresential = value === 'no_cliente' || value === 'no_estabelecimento';

  return (
    <div className="space-y-6">
      <StepHeader
        title="Onde você atende?"
        subtitle="Escolha o formato que combina com o seu serviço."
        why="Isso define se o cliente te encontra por proximidade. Quem atende no endereço do cliente aparece nas buscas da região dele; quem atende à distância aparece para todo o país."
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
              <div className="text-xs text-muted-foreground">{option.desc}</div>
            </button>
          );
        })}
      </div>

      {isPresential ? (
        <div className="space-y-3 border-t border-border pt-6">
          <div>
            <p className="text-sm font-semibold text-foreground">Endereço de referência</p>
            <p className="text-sm text-muted-foreground">
              Usado só para posicionar você na busca por região. O endereço exato não aparece no
              anúncio.
            </p>
          </div>
          <AddressForm
            value={address}
            onChange={setAddress}
            features={{ search: true, modalSearch: true, locationSelection: false, map: false }}
          />
        </div>
      ) : null}

      {value === 'remoto' ? (
        <StepHint tone="info">
          Serviços à distância aparecem para clientes de todo o país, sem filtro de região.
        </StepHint>
      ) : null}
    </div>
  );
}
