/**
 * Bloco `analytics` do kizuna.config.json — quando uma visualização/impressão conta.
 * As regras vivem no CLIENTE (useTrackView); o banco reaplica o piso de tempo por CHECK.
 *
 * {
 *   "enabled": true,
 *   "events": {
 *     "view":          { "minVisibleMs": 1500, "minVisibleRatio": 0.5, "oncePerSession": true },
 *     "contact_click": { "minVisibleMs": 0 }
 *   },
 *   "entities": { "service": { "events": { "view": { "minVisibleMs": 3000 } } } }
 * }
 *
 * `events` presente = só os eventos listados ligam. Ausente = todos com os defaults.
 */

export const ANALYTICS_EVENTS = [
  'impression',
  'view',
  'contact_click',
  'favorite',
  'share',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const ANALYTICS_SOURCES = ['search', 'home', 'category', 'direct', 'share', 'other'] as const;
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];

export type EventRule = {
  /** Tempo contínuo visível (ms) antes de contar. 0 = conta na hora (ações explícitas). */
  minVisibleMs: number;
  /** Fração do elemento na tela (0..1) para considerar "visível". */
  minVisibleRatio: number;
  /** Conta no máximo uma vez por sessão do navegador. */
  oncePerSession: boolean;
};

export type AnalyticsConfig = {
  enabled: boolean;
  events: Partial<Record<AnalyticsEvent, EventRule>>;
  entities: Record<string, Partial<Record<AnalyticsEvent, Partial<EventRule>>>>;
};

/** Espelha os CHECKs de `analytics_events` (view >= 500, impression >= 200). */
export const MIN_VISIBLE_MS_FLOOR: Record<AnalyticsEvent, number> = {
  impression: 200,
  view: 500,
  contact_click: 0,
  favorite: 0,
  share: 0,
};
export const MAX_VISIBLE_MS = 60_000;

const DEFAULT_RULES: Record<AnalyticsEvent, EventRule> = {
  impression: { minVisibleMs: 500, minVisibleRatio: 0.6, oncePerSession: true },
  view: { minVisibleMs: 1500, minVisibleRatio: 0.5, oncePerSession: true },
  contact_click: { minVisibleMs: 0, minVisibleRatio: 0, oncePerSession: false },
  favorite: { minVisibleMs: 0, minVisibleRatio: 0, oncePerSession: false },
  share: { minVisibleMs: 0, minVisibleRatio: 0, oncePerSession: false },
};

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function mergeRule(event: AnalyticsEvent, base: EventRule, raw: unknown): EventRule {
  const o = isObj(raw) ? raw : {};
  return {
    minVisibleMs: clamp(
      numOr(o.minVisibleMs, base.minVisibleMs),
      MIN_VISIBLE_MS_FLOOR[event],
      MAX_VISIBLE_MS
    ),
    minVisibleRatio: clamp(numOr(o.minVisibleRatio, base.minVisibleRatio), 0, 1),
    oncePerSession:
      typeof o.oncePerSession === 'boolean' ? o.oncePerSession : base.oncePerSession,
  };
}

export function parseAnalyticsConfig(raw: unknown): AnalyticsConfig {
  const obj = isObj(raw) ? raw : {};
  const events: AnalyticsConfig['events'] = {};

  if (isObj(obj.events)) {
    for (const event of ANALYTICS_EVENTS) {
      if (event in obj.events) events[event] = mergeRule(event, DEFAULT_RULES[event], obj.events[event]);
    }
  } else {
    for (const event of ANALYTICS_EVENTS) events[event] = { ...DEFAULT_RULES[event] };
  }

  const entities: AnalyticsConfig['entities'] = {};
  if (isObj(obj.entities)) {
    for (const [entityType, entry] of Object.entries(obj.entities)) {
      if (!isObj(entry) || !isObj(entry.events)) continue;
      const overrides: Partial<Record<AnalyticsEvent, Partial<EventRule>>> = {};
      for (const event of ANALYTICS_EVENTS) {
        const o = (entry.events as Record<string, unknown>)[event];
        if (isObj(o)) overrides[event] = o as Partial<EventRule>;
      }
      entities[entityType] = overrides;
    }
  }

  return { enabled: obj.enabled !== false, events, entities };
}

/** Regra efetiva de um evento para uma entidade, ou `null` se o evento está desligado. */
export function resolveEventRule(
  config: AnalyticsConfig,
  entityType: string,
  event: AnalyticsEvent
): EventRule | null {
  if (!config.enabled) return null;
  const base = config.events[event];
  if (!base) return null;
  return mergeRule(event, base, config.entities[entityType]?.[event]);
}
