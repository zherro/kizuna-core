'use client';

import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../ui/button';
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
  /** Texto da tag quando a linha principal não tem apelido. */
  defaultPrimaryLabel?: string;
  /** Texto da tag das demais linhas sem apelido; `{n}` vira a posição (2, 3...). */
  defaultLabel?: string;
  /** aria-label do botão/input que edita o apelido. */
  editLabel?: string;
  primary?: string;
  makePrimary?: string;
  add?: string;
  remove?: string;
  empty?: string;
  limit?: string;
  search?: string;
  /** Rótulo da busca quando o CEP é opcional (`requireZipCode: false`). */
  searchNoZip?: string;
};

const DEFAULT_LABELS: Required<AddressListLabels> = {
  title: 'Endereços de atendimento',
  hint: 'Adicione os locais onde você atende. Marque um como principal — é ele que define sua posição na busca.',
  defaultPrimaryLabel: 'Endereço principal',
  defaultLabel: 'Endereço {n}',
  editLabel: 'Editar apelido do endereço',
  primary: 'Principal',
  makePrimary: 'Tornar principal',
  add: 'Adicionar endereço',
  remove: 'Remover endereço',
  empty: 'Nenhum endereço ainda.',
  limit: 'Limite de endereços atingido.',
  search: 'Não sei meu CEP',
  searchNoZip: 'Pesquisar endereço ou local',
};

const FORM_FEATURES = { search: true, modalSearch: true, locationSelection: false, map: false };

/**
 * Lista editável de endereços do serviço (padrão do `PriceTableEditor`): cada linha é um card com
 * apelido, principal e o resumo do endereço (`AddressForm` compacto — a edição é no painel). O
 * `AddressForm` só lê `value` na montagem, por isso a `key` é o `clientId` estável da linha.
 * Exatamente 1 principal: a 1ª adicionada já nasce principal; remover a principal promove a próxima.
 * Estado controlado (`addresses`/`onChange`); a gravação é do `persist` do passo.
 */
export function AddressListEditor({
  addresses,
  onChange,
  maxAddresses,
  labels,
  requireZipCode = true,
}: {
  addresses: ServiceAddress[];
  onChange: (addresses: ServiceAddress[]) => void;
  maxAddresses: number;
  labels?: AddressListLabels;
  /** `false`: CEP opcional (`LocationOptionConfig.requireZipCode`) — campos liberados sem ele. */
  requireZipCode?: boolean;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const canAdd = addresses.length < maxAddresses;
  // Um endereço só (ex.: eventos): não há principal a escolher nem o que remover — fica só o resumo.
  const single = maxAddresses <= 1;
  // Linha criada pelo botão "Adicionar" → já abre o painel de edição dela.
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const renderForm = (address: ServiceAddress, bare: boolean) => (
    <AddressForm
      value={toAddressValue(address)}
      onChange={(next) =>
        onChange(updateAddress(addresses, address.clientId, fromAddressValue(address, next)))
      }
      features={FORM_FEATURES}
      layout="compact"
      bare={bare}
      autoOpen={address.clientId === justAdded}
      emphasizeCep={requireZipCode}
      requirePostalCode={requireZipCode}
      searchLabel={requireZipCode ? l.search : l.searchNoZip}
    />
  );

  return (
    <div className="space-y-3" data-testid="address-list-editor">
      <div>
        <p className="text-sm font-semibold text-foreground">{l.title}</p>
        <p className="text-sm text-muted-foreground">{l.hint}</p>
      </div>

      {single && addresses[0] ? (
        <div key={addresses[0].clientId}>{renderForm(addresses[0], false)}</div>
      ) : null}

      {!single && addresses.length === 0 ? <p className="text-sm text-muted-foreground">{l.empty}</p> : null}

      {single ? null : <ul className="space-y-3">
        {addresses.map((address, index) => (
          <li
            key={address.clientId}
            className="space-y-3 rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] bg-[color:var(--ui-card-bg,var(--background))] shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] p-3"
            data-primary={address.isPrimary}
          >
            <div className="flex items-center gap-2">
              <LabelTag
                value={address.label}
                fallback={
                  address.isPrimary
                    ? l.defaultPrimaryLabel
                    : l.defaultLabel.replace('{n}', String(index + 1))
                }
                editLabel={l.editLabel}
                onCommit={(label) =>
                  onChange(updateAddress(addresses, address.clientId, { label }))
                }
              />
              {address.isPrimary ? (
                <span className="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary">
                  <Star aria-hidden className="h-3.5 w-3.5 fill-current" />
                  {l.primary}
                </span>
              ) : (
                <button
                  type="button"
                  className="ml-auto inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--ui-radius-control,0.5rem)] px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onChange(setPrimaryAddress(addresses, address.clientId))}
                >
                  <Star aria-hidden className="h-3.5 w-3.5" />
                  {l.makePrimary}
                </button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={l.remove}
                onClick={() => onChange(removeAddress(addresses, address.clientId))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {renderForm(address, true)}
          </li>
        ))}
      </ul>}

      {single ? null : canAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const next = addAddress(addresses, maxAddresses);
            setJustAdded(next[next.length - 1]?.clientId ?? null);
            onChange(next);
          }}
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

const LABEL_MAX = 40;

/**
 * Apelido da linha como tag: mostra o apelido ou, se vazio, o padrão (`fallback`, nunca gravado).
 * Clique vira input inline — Enter/blur grava (máx. 40, vazio volta ao padrão), Esc cancela.
 */
function LabelTag({
  value,
  fallback,
  editLabel,
  onCommit,
}: {
  value: string;
  fallback: string;
  editLabel: string;
  onCommit: (label: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const chip =
    'inline-flex h-7 min-w-0 max-w-[60%] items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-xs font-medium text-foreground';

  if (draft !== null) {
    const commit = () => {
      onCommit(draft.trim().slice(0, LABEL_MAX));
      setDraft(null);
    };
    return (
      <input
        autoFocus
        value={draft}
        maxLength={LABEL_MAX}
        aria-label={editLabel}
        placeholder={fallback}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(null);
          }
        }}
        className={`${chip} w-44 outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={editLabel}
      title={editLabel}
      onClick={() => setDraft(value)}
      className={`${chip} transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`}
    >
      <span className="truncate">{value || fallback}</span>
      <Pencil aria-hidden className="h-3 w-3 shrink-0 text-muted-foreground" />
    </button>
  );
}
