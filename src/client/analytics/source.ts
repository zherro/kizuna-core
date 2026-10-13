import { ANALYTICS_SOURCES, type AnalyticsSource } from '../../shared/analytics';

/** Query param que carrega a origem do clique até o detalhe do anúncio. */
export const SRC_PARAM = 'src';

export function parseSource(v: string | null | undefined): AnalyticsSource | undefined {
  return v && (ANALYTICS_SOURCES as readonly string[]).includes(v) ? (v as AnalyticsSource) : undefined;
}

/** Acrescenta `?src=`/`&src=` a um href interno, preservando query e hash. Externo/absoluto fica intacto. */
export function withSource(href: string, source: AnalyticsSource): string {
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return href;
  const hashAt = href.indexOf('#');
  const hash = hashAt >= 0 ? href.slice(hashAt) : '';
  const rest = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const qAt = rest.indexOf('?');
  const path = qAt >= 0 ? rest.slice(0, qAt) : rest;
  const params = new URLSearchParams(qAt >= 0 ? rest.slice(qAt + 1) : '');
  params.set(SRC_PARAM, source);
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
