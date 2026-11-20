/**
 * Origem de campanha (UTM) — normalização compartilhada por cliente (lê a URL na chegada) e
 * servidor (revalida o que chega). Mesmo formato dos CHECKs da analytics 0005:
 * `^[a-z0-9_.-]{1,64}$`. Valor que não sobra nada depois de limpar = ausente.
 */

export const UTM_MAX_LENGTH = 64;
export const UTM_PATTERN = /^[a-z0-9_.-]{1,64}$/;

export type Utm = { source?: string; medium?: string; campaign?: string };

/** Apelidos comuns de `utm_source` → nome canônico (o painel agrupa pelo canônico). */
const SOURCE_ALIASES: Record<string, string> = {
  ig: 'instagram',
  insta: 'instagram',
  instagram: 'instagram',
  'instagram.com': 'instagram',
  'l.instagram.com': 'instagram',
  wa: 'whatsapp',
  zap: 'whatsapp',
  zapzap: 'whatsapp',
  wpp: 'whatsapp',
  whats: 'whatsapp',
  whatsapp: 'whatsapp',
  'whatsapp.com': 'whatsapp',
  fb: 'facebook',
  face: 'facebook',
  'facebook.com': 'facebook',
  'm.facebook.com': 'facebook',
  'l.facebook.com': 'facebook',
  tt: 'tiktok',
  'tiktok.com': 'tiktok',
  yt: 'youtube',
  'youtube.com': 'youtube',
  tw: 'x',
  twitter: 'x',
  'twitter.com': 'x',
  'x.com': 'x',
  gg: 'google',
  'google.com': 'google',
};

/**
 * Minúsculas, sem acento, espaço/`+` viram `_`, só `[a-z0-9_.-]`, sem pontuação nas pontas,
 * no máximo 64 caracteres. `undefined` se não sobrar nada.
 */
export function normalizeUtmValue(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s+]+/g, '_')
    .replace(/[^a-z0-9_.-]/g, '')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, UTM_MAX_LENGTH)
    .replace(/[_.-]+$/g, '');
  return v ? v : undefined;
}

/** `utm_source` normalizado + apelidos (ig/insta → instagram, wa/zap → whatsapp...). */
export function normalizeUtmSource(raw: unknown): string | undefined {
  const v = normalizeUtmValue(raw);
  if (!v) return undefined;
  return SOURCE_ALIASES[v] ?? (v.startsWith('www.') ? SOURCE_ALIASES[v.slice(4)] ?? v : v);
}

/** Normaliza um objeto utm qualquer (campos inválidos somem). `null` se nada sobrou. */
export function normalizeUtm(raw: { source?: unknown; medium?: unknown; campaign?: unknown } | null | undefined): Utm | null {
  if (!raw) return null;
  const out: Utm = {};
  const source = normalizeUtmSource(raw.source);
  const medium = normalizeUtmValue(raw.medium);
  const campaign = normalizeUtmValue(raw.campaign);
  if (source) out.source = source;
  if (medium) out.medium = medium;
  if (campaign) out.campaign = campaign;
  return out.source || out.medium || out.campaign ? out : null;
}

/** Lê `utm_source`/`utm_medium`/`utm_campaign` de uma query string. `null` se não há nenhum válido. */
export function parseUtmFromSearch(search: string): Utm | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  return normalizeUtm({
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
  });
}
