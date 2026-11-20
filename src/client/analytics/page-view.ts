import { classifyDevice } from '../../shared/analytics/device';
import { CITY_COOKIE, isRoutableSlug } from '../../shared/city-routing/city-slug';
import { postBeacon } from './beacon';
import { getSessionUtm, utmBodyFields } from './utm-session';
import { getVisitorId, isAutomated } from './visitor';

/** Rota do servidor que grava a visita (`createAnalyticsPageViewHandler`). */
export const PAGE_VIEW_URL = '/api/analytics/page-view';
/** Prefixos que nunca contam (painel e API). O servidor reaplica. */
export const PAGE_VIEW_EXCLUDE = ['/painel', '/api'] as const;
export const PAGE_VIEW_MAX_PATH = 200;

/** Só o caminho: sem query (pode ter token/e-mail) e sem hash; sem barra final; no máx. 200. */
export function normalizePagePath(raw: string): string | null {
  let p = (raw || '').split(/[?#]/, 1)[0]!.trim();
  if (!p.startsWith('/')) return null;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p.slice(0, PAGE_VIEW_MAX_PATH) || null;
}

export function isExcludedPath(path: string, exclude: readonly string[] = PAGE_VIEW_EXCLUDE): boolean {
  return exclude.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function readCookie(name: string, cookie: string): string | null {
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      try {
        return decodeURIComponent(v.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Cidade do portal: 1º segmento da rota se for slug de cidade; senão o cookie `kz_city`. */
export function resolvePageCity(path: string, cookie = ''): string | null {
  const first = path.split('/')[1] ?? '';
  if (first && isRoutableSlug(first)) return first;
  const fromCookie = readCookie(CITY_COOKIE, cookie);
  return fromCookie && isRoutableSlug(fromCookie) ? fromCookie : null;
}

const SENT_PREFIX = 'kz-pv:';
const sentMemo = new Set<string>();

function alreadySent(key: string): boolean {
  if (sentMemo.has(key)) return true;
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markSent(key: string) {
  sentMemo.add(key);
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* o UNIQUE do banco absorve a repetição */
  }
}

/**
 * Envia a visita de `rawPath` (uma por caminho por visitante-dia: o banco tem UNIQUE e a sessão
 * evita o beacon repetido). Robô, painel e API não enviam. Devolve se enviou.
 */
export function sendPageView(rawPath: string, opts: { exclude?: readonly string[]; url?: string } = {}): boolean {
  if (typeof window === 'undefined' || isAutomated()) return false;
  const path = normalizePagePath(rawPath);
  if (!path || isExcludedPath(path, opts.exclude ?? PAGE_VIEW_EXCLUDE)) return false;
  const visitor = getVisitorId();
  const key = `${SENT_PREFIX}${visitor}:${path}`;
  if (alreadySent(key)) return false;
  markSent(key);
  const city = resolvePageCity(path, document.cookie);
  postBeacon(
    opts.url ?? PAGE_VIEW_URL,
    JSON.stringify({
      p_path: path,
      p_visitor_hash: visitor,
      p_device: classifyDevice(navigator.userAgent, window.innerWidth),
      ...(city ? { p_city: city } : {}),
      ...utmBodyFields(getSessionUtm()),
    })
  );
  return true;
}

/** Roda `fn` depois do `load` e quando o navegador estiver ocioso (máx. 4 s de espera). */
export function whenIdle(fn: () => void): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const go = () => {
    if (!cancelled) fn();
  };
  const schedule = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(go, { timeout: 4000 });
    else timer = setTimeout(go, 1500);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
    if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
    if (timer !== undefined) clearTimeout(timer);
  };
}
