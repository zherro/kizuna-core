import { NextResponse } from 'next/server';
import { checkRateLimit } from '../ai/rate-limit';
import { serviceRpc, ServiceUnavailableError } from '../service-db';
import { parseAnalyticsConfig, type AnalyticsConfig } from '../../shared/analytics/config';
import { ANALYTICS_DEVICES, classifyDevice, type AnalyticsDevice } from '../../shared/analytics/device';
import { normalizeUtm } from '../../shared/analytics/utm';
import { isRoutableSlug } from '../../shared/city-routing/city-slug';
import { BodyTooLarge, clientIp, isBotUserAgent, isJsonContentType, readBoundedText } from './track-handler';

/**
 * `POST /api/analytics/page-view` — grava a visita de uma página (analytics 0005,
 * `fn_analytics_page_view`). Corpo JSON (sendBeacon pode chegar como `text/plain`), até 2 KB:
 * `{ p_path, p_visitor_hash, p_city?, p_device?, p_utm_source?, p_utm_medium?, p_utm_campaign? }`.
 *
 * - Robô (mesma regra do /track) → 204 sem gravar. Caminho do painel/API (`exclude`) → 204.
 * - Caminho: só o path (query/hash cortados aqui também), começa com `/`, até 200 caracteres.
 * - Cidade: slug de cidade (`cuiaba-mt`); outro valor é ignorado. Aparelho: o do cliente se válido,
 *   senão deduzido do user-agent. UTM renormalizado (inválido some).
 * - Sem IP, região ou user-agent gravados. Rate limit compartilhado com o /track (120/60 s por IP).
 * Respostas: 200 `{ tracked }`; 204 desligado/robô/excluído; 400 inválido; 413; 415; 429. Falha do
 * banco nunca vira 5xx.
 */

const MAX_BODY_BYTES = 2048;
const RATE_MAX = 120;
const RATE_WINDOW_MS = 60_000;
const RPC_NAME = 'fn_analytics_page_view';
const VISITOR_HASH = /^[0-9a-f]{16,64}$/;
const MAX_PATH = 200;

export const DEFAULT_PAGE_VIEW_EXCLUDE = ['/painel', '/api'] as const;

export type AnalyticsPageViewHandlerOptions = {
  config?: AnalyticsConfig;
  /** Prefixos que não contam. Padrão: `/painel` e `/api`. */
  exclude?: readonly string[];
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let p = raw.split(/[?#]/, 1)[0]!.trim();
  if (!p.startsWith('/') || /[\s\u0000-\u001f]/.test(p)) return null;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p ? p.slice(0, MAX_PATH) : null;
}

const excluded = (path: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

let warnedNoFunction = false;
let warnedNoServiceToken = false;

/** Só para testes. */
export function __resetPageViewState(): void {
  warnedNoFunction = false;
  warnedNoServiceToken = false;
}

export function createAnalyticsPageViewHandler(opts: AnalyticsPageViewHandlerOptions = {}) {
  const config = opts.config ?? parseAnalyticsConfig(undefined);
  const exclude = opts.exclude ?? DEFAULT_PAGE_VIEW_EXCLUDE;

  return async function POST(request: Request): Promise<Response> {
    if (!config.enabled) return new NextResponse(null, { status: 204 });
    const ua = request.headers.get('user-agent');
    if (isBotUserAgent(ua)) return new NextResponse(null, { status: 204 });

    const ip = clientIp(request.headers);
    if (!checkRateLimit(`analytics:${ip ?? 'unknown'}`, RATE_MAX, RATE_WINDOW_MS)) {
      return new NextResponse(null, { status: 429 });
    }
    if (!isJsonContentType(request.headers.get('content-type'))) {
      return json({ message: 'Envie JSON.' }, 415);
    }

    let body: unknown;
    try {
      body = JSON.parse(await readBoundedText(request, MAX_BODY_BYTES));
    } catch (error) {
      if (error instanceof BodyTooLarge) return json({ message: 'Corpo muito grande.' }, 413);
      return json({ message: 'Requisição inválida.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ message: 'Requisição inválida.' }, 400);
    }
    const b = body as Record<string, unknown>;

    const path = normalizePath(b.p_path);
    if (!path) return json({ message: 'Caminho inválido.' }, 400);
    if (typeof b.p_visitor_hash !== 'string' || !VISITOR_HASH.test(b.p_visitor_hash)) {
      return json({ message: 'Visitante inválido.' }, 400);
    }
    if (excluded(path, exclude)) return new NextResponse(null, { status: 204 });

    const city = typeof b.p_city === 'string' && isRoutableSlug(b.p_city) ? b.p_city : null;
    let device: AnalyticsDevice | null = null;
    if (config.collect.device) {
      device =
        typeof b.p_device === 'string' && (ANALYTICS_DEVICES as readonly string[]).includes(b.p_device)
          ? (b.p_device as AnalyticsDevice)
          : classifyDevice(ua ?? '', 1024);
    }
    const utm = normalizeUtm({ source: b.p_utm_source, medium: b.p_utm_medium, campaign: b.p_utm_campaign });

    try {
      const res = await serviceRpc(RPC_NAME, {
        p_path: path,
        p_visitor_hash: b.p_visitor_hash,
        p_city: city,
        p_device: device,
        p_utm_source: utm?.source ?? null,
        p_utm_medium: utm?.medium ?? null,
        p_utm_campaign: utm?.campaign ?? null,
      });
      if (!res.ok) {
        if (res.status === 404) {
          if (!warnedNoFunction) {
            warnedNoFunction = true;
            console.warn('[analytics] função fn_analytics_page_view ausente: aplique a migração 0005 do plugin analytics. Visitas não estão sendo gravadas.');
          }
        } else {
          console.error('[analytics] page_view_failed', { status: res.status });
        }
        return json({ tracked: false }, 200);
      }
      const result = await res.json().catch(() => null);
      return json({ tracked: result === true }, 200);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        if (!warnedNoServiceToken) {
          warnedNoServiceToken = true;
          console.warn('[analytics] POSTGREST_SERVICE_TOKEN não configurado: visitas não estão sendo gravadas.');
        }
      } else {
        console.error('[analytics] page_view_failed', { error: error instanceof Error ? error.name : 'unknown' });
      }
      return json({ tracked: false }, 200);
    }
  };
}
