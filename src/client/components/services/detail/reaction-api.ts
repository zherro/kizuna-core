export type Reaction = { uid: string | null; liked: boolean; favorite: boolean };
const EMPTY: Reaction = { uid: null, liked: false, favorite: false };

type Item = { uid: string; liked: boolean; favorite: boolean };

/** Estado do usuário no anúncio. Visitante (401) e erro de rede = "nada marcado". */
export async function fetchReaction(serviceUid: string): Promise<Reaction> {
  try {
    const res = await fetch(
      `/api/resources/service_reactions?filter.service_uid=${encodeURIComponent(serviceUid)}&pageSize=1`
    );
    if (!res.ok) return EMPTY;
    const data = (await res.json().catch(() => null)) as { items?: Item[] } | null;
    const row = data?.items?.[0];
    return row ? { uid: row.uid, liked: row.liked, favorite: row.favorite } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Grava o estado completo (update regrava o registro todo). Descobre POST x PATCH relendo a linha. */
export async function saveReaction(
  serviceUid: string,
  next: { liked: boolean; favorite: boolean }
): Promise<Reaction> {
  const current = await fetchReaction(serviceUid);
  const body = JSON.stringify({ serviceUid, liked: next.liked, favorite: next.favorite });
  const res = await fetch(
    current.uid ? `/api/resources/service_reactions/${current.uid}` : '/api/resources/service_reactions',
    { method: current.uid ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body }
  );
  if (!res.ok) throw new Error(`service_reactions ${res.status}`);
  const data = (await res.json().catch(() => null)) as { item?: Item } | null;
  return {
    uid: data?.item?.uid ?? current.uid,
    liked: next.liked || next.favorite,
    favorite: next.favorite,
  };
}
