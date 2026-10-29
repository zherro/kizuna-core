/**
 * Anúncios vencidos que a busca ainda mostra por uns dias ("já aconteceu"), por grupo.
 * Config: `search.expired` do `kizuna.config.json` — `{ "<slug do grupo>": { "days": 2, "label": "Já aconteceu" } }`.
 */
export type ExpiredGroupConfig = {
  /** Quantos dias depois do `expires_at` o anúncio segue na busca (inteiro > 0). Sem isso, o grupo não mostra vencidos. */
  days: number;
  /** Texto do selo no card. Padrão: `DEFAULT_EXPIRED_LABEL`. */
  label?: string;
};

export type ExpiredByGroup = Record<string, ExpiredGroupConfig>;

export const DEFAULT_EXPIRED_LABEL = 'Encerrado';

/** Dias válidos (inteiro 1..365) ou `null`. */
function validDays(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && n > 0 && n <= 365 ? n : null;
}

/**
 * Corpo `p_expired_grace` da RPC (`fn_search_services`, search 0013): `{ "<slug do grupo>": dias }`.
 * `undefined` quando não há grupo configurado (a chave nem é enviada: banco sem a 0013 recusa).
 */
export function expiredGraceParam(cfg: ExpiredByGroup | undefined): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  for (const [slug, group] of Object.entries(cfg ?? {})) {
    const days = validDays(group?.days);
    if (days != null) out[slug] = days;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Selo do card quando o anúncio já venceu (`expires_at` no passado) e o grupo mostra vencidos;
 * `null` caso contrário (não venceu, sem validade ou grupo sem a config).
 */
export function expiredLabelFor(
  cfg: ExpiredByGroup | undefined,
  groupSlug: string | null | undefined,
  expiresAt: string | null | undefined,
  now: number = Date.now()
): string | null {
  if (!cfg || !groupSlug || !expiresAt) return null;
  const group = cfg[groupSlug];
  if (!group || validDays(group.days) == null) return null;
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t) || t > now) return null;
  return group.label?.trim() || DEFAULT_EXPIRED_LABEL;
}
