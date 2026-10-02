'use client';

import { useEffect, useState } from 'react';
import type { AnalyticsEvent, AnalyticsSource, EventRule } from '../../shared/analytics';
import { sendTrack } from './analytics-api';

export type TrackViewOptions = {
  entityType: string;
  entityId: string;
  event: AnalyticsEvent;
  /** Regra já resolvida no servidor (`resolveEventRule`). `null` = evento desligado. */
  rule: EventRule | null;
  source?: AnalyticsSource;
};

function sessionGet(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function sessionSet(key: string) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* modo privado: pode contar de novo; o UNIQUE do banco absorve */
  }
}

/**
 * Conta a visualização/impressão quando o elemento fica visível (`minVisibleRatio`) por
 * `minVisibleMs` acumulados com a aba em foco. Sai da tela ou troca de aba → congela o
 * cronômetro (não zera). Uso: `const ref = useTrackView(opts); <div ref={ref}>…</div>`.
 */
export function useTrackView(opts: TrackViewOptions): (el: Element | null) => void {
  const [el, setEl] = useState<Element | null>(null);
  const { entityType, entityId, event, rule, source } = opts;
  const minMs = rule?.minVisibleMs ?? 0;
  const ratio = rule?.minVisibleRatio ?? 0;
  const once = rule?.oncePerSession ?? false;
  const enabled = rule !== null;

  useEffect(() => {
    if (!enabled || !el) return;
    const key = `kz-trk:${entityType}:${entityId}:${event}`;
    if (once && sessionGet(key)) return;

    let inView = false;
    let sent = false;
    let accumulated = 0;
    let startedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fire = () => {
      timer = undefined;
      sent = true;
      if (once) sessionSet(key);
      sendTrack({
        entityType,
        entityId,
        event,
        source,
        visibleMs: Math.max(accumulated + (Date.now() - startedAt), minMs),
      });
      cleanup();
    };

    const evaluate = () => {
      if (sent) return;
      const active = inView && document.visibilityState === 'visible';
      if (active && timer === undefined) {
        startedAt = Date.now();
        timer = setTimeout(fire, Math.max(0, minMs - accumulated));
      } else if (!active && timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
        accumulated += Date.now() - startedAt;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries[entries.length - 1]?.isIntersecting ?? false;
        evaluate();
      },
      { threshold: ratio > 0 ? ratio : 0 }
    );
    observer.observe(el);
    document.addEventListener('visibilitychange', evaluate);

    function cleanup() {
      observer.disconnect();
      document.removeEventListener('visibilitychange', evaluate);
      if (timer !== undefined) clearTimeout(timer);
    }
    return cleanup;
  }, [el, enabled, entityType, entityId, event, minMs, ratio, once, source]);

  return setEl;
}
