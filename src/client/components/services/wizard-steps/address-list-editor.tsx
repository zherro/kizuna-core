'use client';

import { Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { AddressForm } from '../../ui-better-soft/google-form/address-google-form';
import type { ServiceAddress } from '../service-type';
import {
  addAddress,
  fromAddressValue,
  removeAddress,
  setPrimaryAddress,
  toAddressValue,
  updateAddress,
} from './service-addresses';

export type AddressListLabels = {
  title?: string;
  hint?: string;
  label?: string;
  primary?: string;
  makePrimary?: string;
  add?: string;
  remove?: string;
  empty?: string;
  limit?: string;
  search?: string;
};

const DEFAULT_LABELS: Required<AddressListLabels> = {
  title: 'Endereços de atendimento',
  hint: 'Adicione os locais onde você atende. Marque um como principal — é ele que define sua posição na busca.',
  label: 'Apelido (opcional, ex.: Matriz)',
  primary: 'Principal',
  makePrimary: 'Tornar principal',
  add: 'Adicionar endereço',
  remove: 'Remover endereço',
  empty: 'Nenhum endereço ainda.',
  limit: 'Limite de endereços atingido.',
  search: 'Não sei meu CEP',
};

const FORM_FEATURES = { search: true, modalSearch: true, locationSelection: false, map: false };

/**
 * Lista editável de endereços do serviço (padrão do `PriceTableEditor`): cada linha é um
 * `AddressForm` — que só lê `value` na montagem, por isso a `key` é o `clientId` estável da linha.
 * Exatamente 1 principal: a 1ª adicionada já nasce principal; remover a principal promove a próxima.
 * Estado controlado (`addresses`/`onChange`); a gravação é do `persist` do passo.
 */
export function AddressListEditor({
  addresses,
  onChange,
  maxAddresses,
  labels,
}: {
  addresses: ServiceAddress[];
  onChange: (addresses: ServiceAddress[]) => void;
  maxAddresses: number;
  labels?: AddressListLabels;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const canAdd = addresses.length < maxAddresses;

  return (
    <div className="space-y-3" data-testid="address-list-editor">
      <div>
        <p className="text-sm font-semibold text-foreground">{l.title}</p>
        <p className="text-sm text-muted-foreground">{l.hint}</p>
      </div>

      {addresses.length === 0 ? <p className="text-sm text-muted-foreground">{l.empty}</p> : null}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li
            key={address.clientId}
            className="space-y-3 rounded-xl border bg-background p-3"
            data-primary={address.isPrimary}
          >
            <div className="flex items-center gap-2">
              <Input
                value={address.label}
                onChange={(event) =>
                  onChange(
                    updateAddress(addresses, address.clientId, {
                      label: event.target.value.slice(0, 40),
                    })
                  )
                }
                placeholder={l.label}
                aria-label={l.label}
              />
              <Button
                type="button"
                variant={address.isPrimary ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
                aria-pressed={address.isPrimary}
                onClick={() => onChange(setPrimaryAddress(addresses, address.clientId))}
              >
                <Star className="mr-1 h-4 w-4" />
                {address.isPrimary ? l.primary : l.makePrimary}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={l.remove}
                onClick={() => onChange(removeAddress(addresses, address.clientId))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <AddressForm
              value={toAddressValue(address)}
              onChange={(next) =>
                onChange(updateAddress(addresses, address.clientId, fromAddressValue(address, next)))
              }
              features={FORM_FEATURES}
              layout="compact"
              searchLabel={l.search}
            />
          </li>
        ))}
      </ul>

      {canAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(addAddress(addresses, maxAddresses))}
        >
          <Plus className="mr-1 h-4 w-4" />
          {l.add}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{l.limit}</p>
      )}
    </div>
  );
}
