import { NextResponse } from 'next/server';
import { checkRateLimit } from '../ai/rate-limit';
import { encryptValue, hmacValue } from '../app-crypto';
import { serviceRpc, ServiceUnavailableError } from '../service-db';
import {
  ANALYTICS_EVENTS,
  ANALYTICS_SOURCES,
  MIN_VISIBLE_MS_FLOOR,
  parseAnalyticsConfig,
  resolveEventRule,
  type AnalyticsConfig,
  type AnalyticsEvent,
} from '../../shared/analytics/config';
import { ANALYTICS_DEVICES, type AnalyticsDevice } from '../../shared/analytics/device';
import { isPublicIp, maskIp, normalizeIp } from '../../shared/analytics/ip';
import { lookupIpRegion } from './ip-geo';

/**
 * `POST /api/analytics/track` — grava um evento de métrica com o contexto que só o servidor tem:
 * aparelho (enviado pelo cliente), região aproximada e IP (dos headers). Corpo JSON (fetch ou
 * `sendBeacon`, que pode chegar como `text/plain`), até 4 KB:
 * `{ p_entity_type, p_entity_id, p_event_type, p_visitor_hash, p_source?, p_visible_ms?, p_device? }`.
 * Campos desconhecidos são ignorados (o cliente não manda IP, região nem viewer).
 *
 * Respostas: 200 `{ tracked }`; 204 analytics/evento desligado na config; 400 corpo inválido;
 * 413 corpo grande; 415 content-type que não é JSON; 429 (corpo vazio) acima de 120 req/60 s
 * por IP — checado antes de ler o corpo, consultar região ou o banco. Falha de geolocalização,
 * cifra, serviço indisponível ou do RPC nunca vira 5xx: grava sem o dado que falhou, ou responde
 * `{ tracked:false }`. O IP (em claro ou cifrado) e o corpo de erro do RPC nunca são logados nem devolvidos.
 *
 * Env `TRUSTED_PROXY_HOPS` (inteiro >= 1, padrão 1; inválido → 1): quantos proxies confiáveis
 * acrescentam ao `x-forwarded-for`. O IP do cliente é o salto nessa posição contada da DIREITA
 * (1 = último, o que o proxy mais próximo acrescentou); os da esquerda o cliente pode forjar. Com
 * uma entrada só (Vercel/Cloudflare sobrescrevem o header) vale essa entrada. Se o salto escolhido
 * não for IP público válido, o evento é gravado sem IP e sem região. `x-real-ip` só sem XFF.
 */

const MAX_BODY_BYTES = 4096;
const RATE_MAX = 120;
const RATE_WINDOW_MS = 60_000;
const IP_PURPOSE = 'analytics-ip';
const RPC_NAME = 'fn_analytics_track_ctx';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISITOR_HASH = /^[0-9a-f]{16,64}$/;
const ENTITY_TYPE = /^[a-z][a-z0-9_]{0,63}$/;
const MAX_VISIBLE_MS = 3_600_000;

export type AnalyticsTrackHandlerOptions = {
  config?: AnalyticsConfig;
  /** Usuário logado (o dono não conta o próprio anúncio). Falha/ausência → `null`. */
  getViewerId?: (req: Request) => Promise<string | null>;
};

type TrackInput = {
  entityType: string;
  entityId: string;
  event: AnalyticsEvent;
  visitorHash: string;
  source: string;
  visibleMs: number;
  device: AnalyticsDevice | null;
};

class BodyTooLarge extends Error {}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

function isJsonContentType(raw: string | null): boolean {
  if (!raw) return true; // Blob sem type
  const type = raw.split(';')[0]!.trim().toLowerCase();
  return type === 'application/json' || type === 'text/plain';
}

/** Lê o corpo sem passar de `MAX_BODY_BYTES` (não confia só no Content-Length). */
async function readBoundedText(request: Request): Promise<string> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new BodyTooLarge();
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLarge();
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(buf);
}

function parseInput(body: Record<string, unknown>, collectDevice: boolean): TrackInput | null {
  const { p_entity_type, p_entity_id, p_event_type, p_visitor_hash, p_source, p_visible_ms, p_device } = body;
  if (typeof p_entity_type !== 'string' || !ENTITY_TYPE.test(p_entity_type)) return null;
  if (typeof p_entity_id !== 'string' || !UUID.test(p_entity_id)) return null;
  if (typeof p_event_type !== 'string' || !(ANALYTICS_EVENTS as readonly string[]).includes(p_event_type)) {
    return null;
  }
  const event = p_event_type as AnalyticsEvent;
  if (typeof p_visitor_hash !== 'string' || !VISITOR_HASH.test(p_visitor_hash)) return null;

  let source = 'direct';
  if (p_source !== undefined && p_source !== null && p_source !== '') {
    if (typeof p_source !== 'string' || !(ANALYTICS_SOURCES as readonly string[]).includes(p_source)) {
      return null;
    }
    source = p_source;
  }

  let visibleMs = 0;
  if (p_visible_ms !== undefined && p_visible_ms !== null) {
    if (typeof p_visible_ms !== 'number' || !Number.isInteger(p_visible_ms)) return null;
    if (p_visible_ms < 0 || p_visible_ms > MAX_VISIBLE_MS) return null;
    visibleMs = p_visible_ms;
  }
  // Mesmo piso do CHECK analytics_events_min_ms (view >= 500, impression >= 200).
  if (visibleMs < MIN_VISIBLE_MS_FLOOR[event]) return null;

  let device: AnalyticsDevice | null = null;
  if (collectDevice && p_device !== undefined && p_device !== null) {
    // Aparelho desconhecido não derruba o evento: ignora o campo (device NULL).
    if (typeof p_device === 'string' && (ANALYTICS_DEVICES as readonly string[]).includes(p_device)) {
      device = p_device as AnalyticsDevice;
    }
  }

  return {
    entityType: p_entity_type,
    entityId: p_entity_id.toLowerCase(),
    event,
    visitorHash: p_visitor_hash,
    source,
    visibleMs,
    device,
  };
}

/** Tira porta de `1.2.3.4:5678` e colchetes de `[v6]:port` (alguns proxies mandam assim). */
function stripPort(hop: string): string {
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(hop);
  if (v4) return v4[1]!;
  const v6 = /^\[([^\]]+)\](?::\d+)?$/.exec(hop);
  return v6 ? v6[1]! : hop;
}

/** `TRUSTED_PROXY_HOPS`: inteiro >= 1; ausente ou inválido → 1. */
function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim() ?? '';
  if (!/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  return n >= 1 ? n : 1;
}

/**
 * IP do cliente como o proxy confiável mais distante o viu: o salto de `x-forwarded-for` contado
 * da DIREITA por `TRUSTED_PROXY_HOPS` (os da esquerda o cliente pode forjar). Header com uma
 * entrada só (Vercel/Cloudflare sobrescrevem) → essa entrada. Sem `x-forwarded-for` → `x-real-ip`.
 * Normalizado, mas pode ser privado; `null` se o salto escolhido não é um IP válido (não procura outro).
 */
function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  let raw: string;
  if (forwarded && forwarded.trim()) {
    const hops = forwarded.split(',').map((h) => h.trim());
    const index = hops.length === 1 ? 0 : hops.length - trustedProxyHops();
    if (index < 0) return null;
    raw = hops[index]!;
  } else {
    raw = headers.get('x-real-ip')?.trim() ?? '';
  }
  return raw ? normalizeIp(stripPort(raw)) : null;
}

type IpFields = { p_ip_masked: string | null; p_ip_key: string | null; p_ip: string | null };
const NO_IP: IpFields = { p_ip_masked: null, p_ip_key: null, p_ip: null };

let warnedKeyUnavailable = false;

/** Só para testes: zera o estado do módulo (aviso único de chave ausente). */
export function __resetAnalyticsTrackState(): void {
  warnedKeyUnavailable = false;
  warnedNoServiceToken = false;
  warnedNoFunction = false;
}

let warnedNoServiceToken = false;
let warnedNoFunction = false;

/** Qualquer falha de chave/cifra → nenhum dos três (nunca o IP em claro por acidente). */
function ipFields(ip: string, encrypt: boolean): IpFields {
  try {
    const key = hmacValue(IP_PURPOSE, ip);
    const stored = encrypt ? encryptValue(IP_PURPOSE, ip) : ip;
    return { p_ip_masked: maskIp(ip), p_ip_key: key, p_ip: stored };
  } catch {
    if (!warnedKeyUnavailable) {
      warnedKeyUnavailable = true;
      console.warn('[analytics] ip_key_unavailable');
    }
    return NO_IP;
  }
}

async function safeRegion(ip: string, headers: Headers) {
  try {
    return await lookupIpRegion(ip, headers);
  } catch {
    return null;
  }
}

async function viewerId(
  getViewerId: AnalyticsTrackHandlerOptions['getViewerId'],
  request: Request
): Promise<string | null> {
  if (!getViewerId) return null;
  try {
    const id = await getViewerId(request);
    return typeof id === 'string' && UUID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function createAnalyticsTrackHandler(opts: AnalyticsTrackHandlerOptions = {}) {
  const config = opts.config ?? parseAnalyticsConfig(undefined);

  return async function POST(request: Request): Promise<Response> {
    if (!config.enabled) return new NextResponse(null, { status: 204 });

    const requestIp = clientIp(request.headers);
    if (!checkRateLimit(`analytics:${requestIp ?? 'unknown'}`, RATE_MAX, RATE_WINDOW_MS)) {
      return new NextResponse(null, { status: 429 });
    }

    if (!isJsonContentType(request.headers.get('content-type'))) {
      return json({ message: 'Envie JSON.' }, 415);
    }

    let text: string;
    try {
      text = await readBoundedText(request);
    } catch (error) {
      if (error instanceof BodyTooLarge) return json({ message: 'Corpo muito grande.' }, 413);
      return json({ message: 'Requisição inválida.' }, 400);
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ message: 'Requisição inválida.' }, 400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ message: 'Requisição inválida.' }, 400);
    }

    const { collect } = config;
    const input = parseInput(body as Record<string, unknown>, collect.device);
    if (!input) return json({ message: 'Evento inválido.' }, 400);
    if (!resolveEventRule(config, input.entityType, input.event)) {
      return new NextResponse(null, { status: 204 });
    }

    const ip = requestIp && isPublicIp(requestIp) ? requestIp : null;

    const [region, viewer] = await Promise.all([
      collect.region && ip ? safeRegion(ip, request.headers) : Promise.resolve(null),
      viewerId(opts.getViewerId, request),
    ]);

    const ipData = collect.ip && ip ? ipFields(ip, collect.encryptIp) : NO_IP;

    const args = {
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_event_type: input.event,
      p_visitor_hash: input.visitorHash,
      p_source: input.source,
      p_visible_ms: input.visibleMs,
      p_device: input.device,
      p_region_city: region?.city || null,
      p_region_uf: region?.uf ?? null,
      ...ipData,
      p_viewer_id: viewer,
    };

    try {
      const res = await serviceRpc(RPC_NAME, args);
      if (!res.ok) {
        // Só o status: o corpo do erro pode citar valores da linha.
        if (res.status === 404) {
          if (!warnedNoFunction) {
            warnedNoFunction = true;
            console.warn('[analytics] função fn_analytics_track_ctx ausente: aplique a migração 0003 do plugin analytics. Eventos não estão sendo gravados.');
          }
        } else {
          console.error('[analytics] track_failed', { status: res.status });
        }
        return json({ tracked: false }, 200);
      }
      const result = await res.json().catch(() => null);
      return json({ tracked: result === true }, 200);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        if (!warnedNoServiceToken) {
          warnedNoServiceToken = true;
          console.warn('[analytics] POSTGREST_SERVICE_TOKEN não configurado: o plugin analytics precisa dele para gravar eventos (node kizuna-core/cli token service). Eventos não estão sendo gravados.');
        }
      } else {
        console.error('[analytics] track_failed', {
          error: error instanceof Error ? error.name : 'unknown',
        });
      }
      return json({ tracked: false }, 200);
    }
  };
}
