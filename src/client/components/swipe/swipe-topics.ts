/** Temas escolhidos no questionário do swipe (slugs de `categories_group`), guardados no aparelho. */
const KEY = 'kizuna:swipe:topics';

/** `null` = nunca escolheu (ou storage indisponível/corrompido). Lista vazia nunca conta como escolha. */
export function loadSwipeTopics(): string[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const slugs = parsed.filter((s): s is string => typeof s === 'string' && s.length > 0);
    return slugs.length ? slugs : null;
  } catch {
    return null;
  }
}

export function saveSwipeTopics(slugs: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* storage cheio/bloqueado: a escolha vale só nesta sessão */
  }
}
