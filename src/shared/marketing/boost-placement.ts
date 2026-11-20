/**
 * Regra de destaque do IMPULSIONAMENTO (plugin marketing) nas listas públicas. Pura: roda no servidor
 * (HTML do ISR) e no navegador. Quem escolhe os impulsionados que casam com a lista é o banco
 * (`fn_search_services` 0014, `p_sponsored_max`): os escolhidos vêm com `sponsor_slot` 1..N, já no
 * topo, respeitando cidade/categoria/texto. Aqui só se decide a EXIBIÇÃO:
 *   - `pinSponsored`: vaga patrocinada sempre na frente (partição estável, nada se perde);
 *   - `pickSponsored`: rodízio — de K candidatos que o banco mandou, mostra `max` (sorteio por visita);
 *     os não sorteados voltam para o FIM da lista (não ganham a frente de graça).
 *
 * Config (kizuna.config.json → `marketing.boost`, tudo opcional):
 *   searchSlots — vagas no topo da /busca (padrão 2)
 *   railSlots   — vagas no início de cada trilha da home (padrão 1)
 *   railPool    — candidatos que o banco manda por trilha, para o rodízio no navegador (padrão 3)
 *   listSlots   — vagas nas outras listas do servidor: Hoje, "Também pode te interessar",
 *                 vitrine da /busca (padrão 1)
 * `enabled: false` desliga tudo (nenhum parâmetro novo vai ao banco — comportamento de antes).
 */

export type BoostPlacementConfig = {
  enabled: boolean;
  searchSlots: number;
  railSlots: number;
  railPool: number;
  listSlots: number;
};

export const DEFAULT_BOOST_PLACEMENT: BoostPlacementConfig = {
  enabled: true,
  searchSlots: 2,
  railSlots: 1,
  railPool: 3,
  listSlots: 1,
};

/** Teto do banco (`fn_search_services` 0014 corta em 10). */
export const MAX_SPONSORED_SLOTS = 10;

function slots(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(MAX_SPONSORED_SLOTS, Math.max(0, Math.floor(v)));
}

/** Lê `marketing.boost`. Valor inválido cai no padrão; `railPool` nunca é menor que `railSlots`. */
export function parseBoostPlacementConfig(raw: unknown): BoostPlacementConfig {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_BOOST_PLACEMENT;
  const railSlots = slots(o.railSlots, d.railSlots);
  return {
    enabled: o.enabled !== false,
    searchSlots: slots(o.searchSlots, d.searchSlots),
    railSlots,
    railPool: Math.max(railSlots, slots(o.railPool, d.railPool)),
    listSlots: slots(o.listSlots, d.listSlots),
  };
}

/**
 * Valor de `p_sponsored_max` para o corpo da RPC: `undefined` (não manda a chave) quando o recurso está
 * desligado — o banco sem a 0014 continua aceitando a chamada.
 */
export function sponsoredMaxParam(cfg: BoostPlacementConfig, slotsWanted: number): number | undefined {
  return cfg.enabled ? Math.min(MAX_SPONSORED_SLOTS, Math.max(0, Math.floor(slotsWanted))) : undefined;
}

export type SponsorCandidate = { sponsor_slot?: number | null };

export function isSponsored(item: SponsorCandidate): boolean {
  return typeof item.sponsor_slot === 'number' && item.sponsor_slot > 0;
}

/** Patrocinados na frente (na ordem da vaga), o resto na ordem original. Não muta a entrada. */
export function pinSponsored<T extends SponsorCandidate>(items: readonly T[]): T[] {
  const pinned = items.filter(isSponsored).sort((a, b) => (a.sponsor_slot ?? 0) - (b.sponsor_slot ?? 0));
  if (pinned.length === 0) return [...items];
  return [...pinned, ...items.filter((i) => !isSponsored(i))];
}

/**
 * Rodízio: entre os candidatos patrocinados, mostra até `max` na frente. Sem `rand`, os primeiros pela
 * vaga (determinístico: mesmo HTML no servidor e na hidratação); com `rand`, sorteio. Os candidatos
 * não escolhidos perdem a marca de vaga (`sponsor_slot: null`, viram orgânicos) e vão para o FIM.
 */
export function pickSponsored<T extends SponsorCandidate>(
  items: readonly T[],
  max: number,
  rand?: () => number,
): { pinned: T[]; rest: T[] } {
  const candidates = items.filter(isSponsored).sort((a, b) => (a.sponsor_slot ?? 0) - (b.sponsor_slot ?? 0));
  const organic = items.filter((i) => !isSponsored(i));
  const take = Math.max(0, Math.floor(max));
  if (candidates.length === 0 || take === 0) {
    return { pinned: [], rest: [...organic, ...candidates.map((c) => ({ ...c, sponsor_slot: null }))] };
  }
  const order = [...candidates];
  if (rand) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  const pinned = order.slice(0, take).map((c, i) => ({ ...c, sponsor_slot: i + 1 }));
  const dropped = order.slice(take).map((c) => ({ ...c, sponsor_slot: null }));
  return { pinned, rest: [...organic, ...dropped] };
}
