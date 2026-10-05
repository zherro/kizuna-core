export type ReactionKind = 'like' | 'favorite';

/** Estado do usuário no anúncio + totais do anúncio (`services.like_count` / `favorite_count`). */
export type Reaction = { liked: boolean; favorite: boolean; likeCount: number; favoriteCount: number };

type Row = { liked: boolean; favorite: boolean; like_count: number; favorite_count: number };

function toReaction(row: Row | undefined): Reaction | null {
  if (!row) return null;
  return {
    liked: Boolean(row.liked),
    favorite: Boolean(row.favorite),
    likeCount: Number(row.like_count ?? 0),
    favoriteCount: Number(row.favorite_count ?? 0),
  };
}

async function rpc(name: string, body: unknown): Promise<Reaction | null> {
  const res = await fetch(`/api/resources/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  const data = (await res.json().catch(() => null)) as { items?: Row[] } | null;
  return toReaction(data?.items?.[0]);
}

/** Estado atual (`fn_service_reaction_state`). Visitante recebe nada marcado; erro = `null`. */
export async function fetchReaction(serviceUid: string): Promise<Reaction | null> {
  try {
    return await rpc('fn_service_reaction_state', { p_service_uid: serviceUid });
  } catch {
    return null;
  }
}

/**
 * Liga/desliga `like` ou `favorite` (`fn_service_react`). Remover não apaga a linha — vira
 * `active = false` e o total do anúncio é decrementado pela trigger. Devolve o estado novo.
 */
export async function setReaction(serviceUid: string, kind: ReactionKind, active: boolean): Promise<Reaction> {
  const r = await rpc('fn_service_react', { p_service_uid: serviceUid, p_kind: kind, p_active: active });
  if (!r) throw new Error('fn_service_react sem retorno');
  return r;
}
