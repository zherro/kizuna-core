import { normalizeUtm, parseUtmFromSearch, type Utm } from '../../shared/analytics/utm';

/** Chave da sessionStorage com a origem de campanha da sessão (JSON `{source,medium,campaign}`). */
export const UTM_STORAGE_KEY = 'kz-utm';

let memo: Utm | null = null;

/**
 * Origem de campanha da SESSÃO: se a URL atual traz utm_* válido, ele vale (e substitui o guardado:
 * último clique de campanha ganha); senão, o que foi guardado na chegada. Guarda em sessionStorage
 * (some ao fechar a aba). Sem storage (modo privado), fica em memória até recarregar.
 */
export function getSessionUtm(search?: string): Utm | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = parseUtmFromSearch(search ?? window.location.search);
  if (fromUrl) {
    memo = fromUrl;
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
      /* fica só em memória */
    }
    return fromUrl;
  }
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (raw) {
      // Revalida: o storage pode ter sido mexido à mão.
      const stored = normalizeUtm(JSON.parse(raw) as Record<string, unknown>);
      if (stored) return stored;
    }
  } catch {
    /* segue para a memória */
  }
  return memo;
}

/** Campos `p_utm_*` para o corpo do evento (só os presentes). */
export function utmBodyFields(utm: Utm | null): Record<string, string> {
  if (!utm) return {};
  const out: Record<string, string> = {};
  if (utm.source) out.p_utm_source = utm.source;
  if (utm.medium) out.p_utm_medium = utm.medium;
  if (utm.campaign) out.p_utm_campaign = utm.campaign;
  return out;
}

/** Só para testes. */
export function __resetUtmMemo(): void {
  memo = null;
}
