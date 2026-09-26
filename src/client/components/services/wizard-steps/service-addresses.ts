import type { ServiceAddress } from '../service-type';
import type { AddressValue } from '../../ui-better-soft/google-form/address-google-form';

/** Lógica pura da lista de endereços do serviço (sem React) — testável isoladamente. */

let addressSeq = 0;
export function newClientId(): string {
  addressSeq += 1;
  return `addr-new-${Date.now().toString(36)}-${addressSeq}`;
}

export function emptyServiceAddress(isPrimary = false): ServiceAddress {
  return {
    clientId: newClientId(),
    label: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    cityIbge: null,
    latitude: null,
    longitude: null,
    placeId: null,
    isPrimary,
  };
}

/** Completo = CEP + rua + número (mesma regra do passo antigo). */
export function isAddressComplete(
  a: Pick<ServiceAddress, 'zipCode' | 'street' | 'number'>
): boolean {
  return Boolean(a.zipCode?.trim() && a.street?.trim() && a.number?.trim());
}

export function hasSinglePrimary(addresses: ServiceAddress[]): boolean {
  return addresses.filter((a) => a.isPrimary).length === 1;
}

/** Garante exatamente 1 principal (se houver linhas): mantém a primeira marcada, ou promove a 1ª. */
export function normalizePrimary(addresses: ServiceAddress[]): ServiceAddress[] {
  if (addresses.length === 0) return addresses;
  const first = addresses.findIndex((a) => a.isPrimary);
  const idx = first === -1 ? 0 : first;
  return addresses.map((a, i) =>
    a.isPrimary === (i === idx) ? a : { ...a, isPrimary: i === idx }
  );
}

/** Adiciona uma linha vazia (a 1ª vira principal). No-op no limite. */
export function addAddress(addresses: ServiceAddress[], max: number): ServiceAddress[] {
  if (addresses.length >= max) return addresses;
  return [...addresses, emptyServiceAddress(addresses.length === 0)];
}

/** Remove a linha; se era a principal, promove a próxima (ou a última restante). */
export function removeAddress(addresses: ServiceAddress[], clientId: string): ServiceAddress[] {
  const idx = addresses.findIndex((a) => a.clientId === clientId);
  if (idx === -1) return addresses;
  const rest = addresses.filter((a) => a.clientId !== clientId);
  if (!addresses[idx].isPrimary || rest.length === 0) return rest;
  const promote = Math.min(idx, rest.length - 1);
  return rest.map((a, i) => (i === promote ? { ...a, isPrimary: true } : a));
}

export function setPrimaryAddress(addresses: ServiceAddress[], clientId: string): ServiceAddress[] {
  return addresses.map((a) => ({ ...a, isPrimary: a.clientId === clientId }));
}

export function updateAddress(
  addresses: ServiceAddress[],
  clientId: string,
  patch: Partial<ServiceAddress>
): ServiceAddress[] {
  return addresses.map((a) => (a.clientId === clientId ? { ...a, ...patch } : a));
}

export function toAddressValue(a: ServiceAddress): Partial<AddressValue> {
  return {
    postalCode: a.zipCode,
    street: a.street,
    number: a.number,
    complement: a.complement,
    neighborhood: a.neighborhood,
    city: a.city,
    state: a.state,
    country: 'BR',
    latitude: a.latitude,
    longitude: a.longitude,
    placeId: a.placeId,
  };
}

/** AddressValue → campos de ServiceAddress. Se o CEP mudou, o IBGE antigo deixa de valer. */
export function fromAddressValue(prev: ServiceAddress, v: AddressValue): Partial<ServiceAddress> {
  const zip = v.postalCode.replace(/\D/g, '');
  return {
    zipCode: zip,
    street: v.street,
    number: v.number,
    complement: v.complement,
    neighborhood: v.neighborhood,
    city: v.city,
    state: v.state,
    latitude: v.latitude,
    longitude: v.longitude,
    placeId: v.placeId,
    cityIbge: zip === prev.zipCode ? prev.cityIbge : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Sync (diff) contra /api/resources/service_addresses
// ---------------------------------------------------------------------------------------------

const SYNC_FIELDS = [
  'label',
  'zipCode',
  'street',
  'number',
  'complement',
  'neighborhood',
  'city',
  'state',
  'cityIbge',
  'latitude',
  'longitude',
  'placeId',
  'isPrimary',
] as const;

export function addressChanged(a: ServiceAddress, b: ServiceAddress): boolean {
  return SYNC_FIELDS.some((k) => a[k] !== b[k]);
}

export type AddressDiff = {
  toDelete: ServiceAddress[];
  toCreate: ServiceAddress[];
  toUpdate: ServiceAddress[];
};

/** Só o que mudou. Linhas incompletas (sem CEP/rua/número) nunca são gravadas. */
export function diffAddresses(current: ServiceAddress[], prev: ServiceAddress[]): AddressDiff {
  const persistable = current.filter(isAddressComplete);
  const keptIds = new Set(persistable.map((a) => a.id).filter(Boolean));
  const prevById = new Map(prev.filter((p) => p.id).map((p) => [p.id as string, p]));
  return {
    toDelete: prev.filter((p) => p.id && !keptIds.has(p.id)),
    toCreate: persistable.filter((a) => !a.id),
    toUpdate: persistable.filter((a) => {
      const before = a.id ? prevById.get(a.id) : undefined;
      return before ? addressChanged(a, before) : false;
    }),
  };
}

/** Executa `tasks` com no máximo `limit` em voo. */
export async function runLimited<T>(tasks: Array<() => Promise<T>>, limit = 5): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const ERROR = 'Nao foi possivel salvar os enderecos do servico.';

function payload(serviceId: string, a: ServiceAddress) {
  const { clientId: _c, id: _i, ...rest } = a;
  return { ...rest, serviceId };
}

/** Preenche `cityIbge` via /api/location/cep (plugin location). Best-effort: falha → null. */
async function withIbge(a: ServiceAddress): Promise<ServiceAddress> {
  const cep = a.zipCode.replace(/\D/g, '');
  if (a.cityIbge || cep.length !== 8) return a;
  try {
    const res = await fetch(`/api/location/cep?cep=${cep}`, { cache: 'no-store' });
    if (!res.ok) return a;
    const data = (await res.json().catch(() => null)) as { ibge?: string } | null;
    const ibge = String(data?.ibge ?? '').replace(/\D/g, '');
    return ibge ? { ...a, cityIbge: ibge } : a;
  } catch {
    return a;
  }
}

/**
 * Reconcilia `service_addresses` por diff (DELETE removidos, POST novos, PATCH alterados), até 5
 * requisições em paralelo, sem refetch. O índice único de principal (1 por serviço) impõe a ordem:
 * fase 1 remove/rebaixa/cria não-principais; fase 2 grava a principal.
 * Devolve as linhas gravadas já com ids (mesma ordem de `current`). Lança em qualquer falha.
 */
export async function syncServiceAddresses(
  serviceId: string,
  current: ServiceAddress[],
  prev: ServiceAddress[]
): Promise<ServiceAddress[]> {
  const diff = diffAddresses(current, prev);
  const persistable = current.filter(isAddressComplete);
  if (diff.toDelete.length + diff.toCreate.length + diff.toUpdate.length === 0) {
    return persistable;
  }

  const saved = new Map<string, ServiceAddress>(); // clientId → gravado

  const upsert = (raw: ServiceAddress) => async () => {
    const a = await withIbge(raw);
    const url = a.id
      ? `/api/resources/service_addresses/${a.id}`
      : '/api/resources/service_addresses';
    const res = await fetch(url, {
      method: a.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(serviceId, a)),
    });
    if (!res.ok) throw new Error(ERROR);
    if (a.id) {
      saved.set(a.clientId, a);
    } else {
      const data = (await res.json().catch(() => null)) as { item?: { id?: string } } | null;
      if (!data?.item?.id) throw new Error(ERROR);
      saved.set(a.clientId, { ...a, id: String(data.item.id) });
    }
  };

  const remove = (a: ServiceAddress) => async () => {
    const res = await fetch(`/api/resources/service_addresses/${a.id}`, { method: 'DELETE' });
    // 404 = já removida no servidor.
    if (!res.ok && res.status !== 404) throw new Error(ERROR);
  };

  const writes = [...diff.toCreate, ...diff.toUpdate];
  const phase1 = writes.filter((a) => !a.isPrimary);
  const phase2 = writes.filter((a) => a.isPrimary);

  await runLimited([...diff.toDelete.map(remove), ...phase1.map(upsert)], 5);
  await runLimited(phase2.map(upsert), 5);

  return persistable.map((a) => saved.get(a.clientId) ?? a);
}
