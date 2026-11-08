'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLiveBoosts } from './live-boosts';

/** PRNG pequeno e determinístico (mulberry32): mesma semente, mesma ordem — testável e sem `Math.random` no render. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Separa, dos itens JÁ CARREGADOS, os que têm impulsionamento vigente (até `max`, sorteados) do resto.
 * Os impulsionados além de `max` ficam no resto, na posição original. Pura.
 *
 * Limitação (documentada): só promove o que já veio na página de resultados. A rota genérica
 * `/api/resources/<recurso>` filtra por igualdade (`filter.<coluna>=`), sem "in", e a regra do plugin é
 * não criar função SQL — então não há como buscar, por consulta direta, todos os impulsionados que
 * casam com a busca. Um impulsionado que a busca não trouxe não aparece na faixa.
 */
export function pickPromoted<T>(
  items: readonly T[],
  live: ReadonlySet<string>,
  uidOf: (item: T) => string,
  max: number,
  rand: () => number,
): { promoted: T[]; rest: T[] } {
  if (live.size === 0 || max <= 0) return { promoted: [], rest: [...items] };
  const boosted = items.filter((i) => live.has(uidOf(i)));
  const promoted = shuffled(boosted, rand).slice(0, max);
  const taken = new Set(promoted);
  return { promoted, rest: items.filter((i) => !taken.has(i)) };
}

/**
 * Intercala 1 patrocinado a cada `every` itens: o k-ésimo entra depois do (k+1)·every-ésimo item. Os que
 * sobrarem (lista curta) vão para o fim — nenhum se perde. Item com a mesma chave de um patrocinado sai
 * da lista comum, para não duplicar. Pura.
 */
export function interleaveSponsored<T>(
  items: readonly T[],
  sponsored: readonly T[],
  every = 4,
  keyOf: (item: T) => string = (i) => String(i),
): T[] {
  const step = Math.max(1, Math.floor(every));
  const sponsoredKeys = new Set(sponsored.map(keyOf));
  const seen = new Set<string>();
  const queue: T[] = [];
  for (const s of sponsored) {
    const k = keyOf(s);
    if (!seen.has(k)) {
      seen.add(k);
      queue.push(s);
    }
  }
  const out: T[] = [];
  let n = 0;
  let next = 0;
  for (const item of items) {
    if (sponsoredKeys.has(keyOf(item))) continue;
    out.push(item);
    n += 1;
    if (n % step === 0 && next < queue.length) out.push(queue[next++]);
  }
  while (next < queue.length) out.push(queue[next++]);
  return out;
}

/**
 * Itens impulsionados agora entre `items`, sorteados no cliente (uma vez por montagem: a semente é
 * fixa até o componente sair da tela). Sem impulsionamento vigente ou antes de a consulta voltar,
 * `promoted` é vazio e `rest` é a lista inteira — o primeiro render é igual ao do servidor.
 */
export function usePromotedBoosted<T>(items: readonly T[], uidOf: (item: T) => string, max = 3) {
  const live = useLiveBoosts();
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  return useMemo(
    () => pickPromoted(items, live, uidOf, max, seededRandom(seed)),
    // uidOf costuma ser uma arrow nova a cada render; a identidade de `items`/`live` é o que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, live, max, seed],
  );
}

export type SponsoredStripProps<T> = {
  /** Itens já promovidos (`usePromotedBoosted().promoted`). Vazio: nada é renderizado. */
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  heading?: string;
  /** Classe do contêiner dos itens (a busca passa a mesma grade dos resultados). */
  listClassName?: string;
  className?: string;
};

/**
 * Faixa "Indicados pelo Bora" no topo dos resultados: os anúncios impulsionados em evidência, com a
 * mesma grade e os mesmos cards da lista (cada card já leva o selo BORA INDICA). Sem itens, colapsa.
 */
export function SponsoredStrip<T>({
  items,
  keyOf,
  renderItem,
  heading = 'Indicados pelo Bora',
  listClassName,
  className,
}: SponsoredStripProps<T>) {
  if (items.length === 0) return null;
  return (
    <section aria-label={heading} data-sponsored-strip className={cn('mb-6', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Star aria-hidden="true" className="h-4 w-4 fill-current text-brand" />
        <h2 className="text-sm font-bold text-foreground">{heading}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Patrocinado</span>
      </div>
      <div className={listClassName ?? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
        {items.map((item) => (
          <div key={keyOf(item)} className="contents">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </section>
  );
}
