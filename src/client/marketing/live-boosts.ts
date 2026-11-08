'use client';
import { useEffect, useState } from 'react';

/**
 * Anúncios com impulsionamento vigente (`vw_boosts_live`, só o uid — sem valores).
 *
 * SEM CACHE de propósito: as páginas são ISR (5/15 min) e o selo/faixa precisam refletir pausa e
 * saldo na hora. O HTML cacheado nunca carrega o estado pago; ele chega depois, por aqui. O único
 * reaproveitamento é o de uma carga de página (vários cards pedindo juntos): 10 s em memória do
 * navegador, para 30 cards não virarem 30 requisições.
 */
const REUSE_MS = 10_000;
const PAGE_SIZE = 1000;

let inflight: { at: number; promise: Promise<Set<string>> } | null = null;

export async function fetchLiveBoosts(): Promise<Set<string>> {
  try {
    const res = await fetch(`/api/resources/vw_boosts_live?pageSize=${PAGE_SIZE}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!res.ok) return new Set();
    const body = (await res.json()) as { items?: Array<{ serviceUid?: string }> };
    return new Set((body.items ?? []).map((i) => String(i.serviceUid ?? '')).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function loadLiveBoosts(now: number = Date.now()): Promise<Set<string>> {
  if (!inflight || now - inflight.at > REUSE_MS) inflight = { at: now, promise: fetchLiveBoosts() };
  return inflight.promise;
}

export function __resetLiveBoosts() {
  inflight = null;
}

/** Conjunto de uids impulsionados agora. Vazio no servidor e no primeiro render (sem divergência de hidratação). */
export function useLiveBoosts(): ReadonlySet<string> {
  const [set, setSet] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    let cancelled = false;
    void loadLiveBoosts().then((s) => {
      if (!cancelled) setSet(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return set;
}

/** `true` se o anúncio (uid) tem impulsionamento vigente. */
export function useIsBoosted(serviceUid: string | null | undefined): boolean {
  const live = useLiveBoosts();
  return !!serviceUid && live.has(serviceUid);
}
