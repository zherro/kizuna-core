import { ANALYTICS_SOURCES, type AnalyticsPlacement, type AnalyticsSource } from '../../shared/analytics';

/** Query param que carrega a origem do clique até o detalhe do anúncio. */
export const SRC_PARAM = 'src';
/** Query param que marca o clique vindo de uma vaga patrocinada (`pl=sp`). */
export const PLACEMENT_PARAM = 'pl';
const PLACEMENT_SPONSORED = 'sp';

export function parseSource(v: string | null | undefined): AnalyticsSource | undefined {
  return v && (ANALYTICS_SOURCES as readonly string[]).includes(v) ? (v as AnalyticsSource) : undefined;
}

/**
 * Acrescenta `?src=`/`&src=` a um href interno, preservando query e hash. Externo/absoluto fica intacto.
 * Com `placement: 'sponsored'` acrescenta também `pl=sp` (o detalhe atribui view/contato à vaga paga).
 */
export function withSource(href: string, source: AnalyticsSource, placement?: AnalyticsPlacement | null): string {
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return href;
  const hashAt = href.indexOf('#');
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  const rest = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const qAt = rest.indexOf('?');
  const path = qAt >= 0 ? rest.slice(0, qAt) : rest;
  const params = new URLSearchParams(qAt >= 0 ? rest.slice(qAt + 1) : '');
  params.set(SRC_PARAM, source);
  if (placement === 'sponsored') params.set(PLACEMENT_PARAM, PLACEMENT_SPONSORED);
  return `${path}?${params.toString()}${hash}`;
}

const STORE_PREFIX = 'kz-src:';

/** Origem de um referrer interno (mesma origem); `undefined` se externo/vazio. */
export function sourceFromReferrer(referrer: string, origin: string): AnalyticsSource | undefined {
  if (!referrer) return undefined;
  try {
    const u = new URL(referrer);
    if (u.origin !== origin) return undefined;
    if (u.pathname === '/') return 'home';
    if (u.pathname.startsWith('/busca')) return 'search';
    if (u.pathname === '/hoje' || u.pathname.endsWith('/hoje')) return 'today';
    if (u.pathname.startsWith('/descobrir')) return 'swipe';
    return 'other';
  } catch {
    return undefined;
  }
}

/**
 * Resolve (e memoriza em sessionStorage, por uid) a origem do detalhe:
 * `?src=` > valor guardado > referrer interno > 'direct'.
 */
export function resolveAdSource(uid: string): AnalyticsSource {
  if (typeof window === 'undefined') return 'direct';
  const key = `${STORE_PREFIX}${uid}`;
  const fromUrl = parseSource(new URLSearchParams(window.location.search).get(SRC_PARAM));
  if (fromUrl) {
    try {
      sessionStorage.setItem(key, fromUrl);
    } catch {
      /* ignora */
    }
    return fromUrl;
  }
  try {
    const stored = parseSource(sessionStorage.getItem(key));
    if (stored) return stored;
  } catch {
    /* ignora */
  }
  const resolved =
    sourceFromReferrer(document.referrer, window.location.origin) ?? 'direct';
  try {
    sessionStorage.setItem(key, resolved);
  } catch {
    /* ignora */
  }
  return resolved;
}

const PL_STORE_PREFIX = 'kz-pl:';

/**
 * O detalhe foi aberto a partir de uma vaga patrocinada? `?pl=sp` na URL (guardado na sessão, por uid,
 * para os cliques de contato depois de navegar dentro da página) > valor guardado > orgânico (null).
 */
export function resolveAdPlacement(uid: string): AnalyticsPlacement | null {
  if (typeof window === 'undefined') return null;
  const key = `${PL_STORE_PREFIX}${uid}`;
  const fromUrl = new URLSearchParams(window.location.search).get(PLACEMENT_PARAM) === PLACEMENT_SPONSORED;
  try {
    if (fromUrl) {
      sessionStorage.setItem(key, PLACEMENT_SPONSORED);
      return 'sponsored';
    }
    return sessionStorage.getItem(key) === PLACEMENT_SPONSORED ? 'sponsored' : null;
  } catch {
    return fromUrl ? 'sponsored' : null;
  }
}
