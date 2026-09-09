'use client';

import { useCallback, useRef, useState } from 'react';
import { classifyAiError } from '../../shared/ai-error';

/** Falhas transitórias seguidas antes de desistir da IA (vira modo manual permanente). */
const MAX_FAILURES = 5;

export type AiDegradationStatus = 'ready' | 'degraded' | 'unavailable';

export interface UseAiDegradation {
  status: AiDegradationStatus;
  /** Classifica o erro e avança a máquina de degradação. */
  report(error: unknown): void;
  /** Só tira de `'degraded'` de volta para `'ready'` (o contador transitório fica). */
  retry(): void;
  /** Volta tudo ao estado inicial: `'ready'`, contador zerado. */
  reset(): void;
}

/**
 * Máquina de degradação sticky para features de IA no client. Espelha o
 * `registerFailure` de `useNaviAnuncio`:
 *
 * - `report(err)` com causa `'blocked'` → `'unavailable'` (permanente na vida do componente).
 * - `report(err)` com causa `'transient'` → incrementa o contador; na 5ª falha → `'unavailable'`;
 *   antes disso → `'degraded'`.
 * - `retry()` → só `'degraded'` → `'ready'`.
 * - `reset()` → `'ready'`, contador 0.
 *
 * `contextKey` hoje é só um rótulo de identidade — cada instância do hook é independente e não
 * persiste. Mantido como parâmetro para uso futuro e para o chamador se auto-documentar.
 */
export function useAiDegradation(contextKey: string): UseAiDegradation {
  void contextKey;
  const [status, setStatus] = useState<AiDegradationStatus>('ready');
  const failureCountRef = useRef(0);

  const report = useCallback((error: unknown) => {
    const reason = classifyAiError(error);
    if (reason === 'transient') failureCountRef.current += 1;
    const permanent = reason === 'blocked' || failureCountRef.current >= MAX_FAILURES;
    setStatus(permanent ? 'unavailable' : 'degraded');
  }, []);

  const retry = useCallback(() => {
    setStatus((s) => (s === 'degraded' ? 'ready' : s));
  }, []);

  const reset = useCallback(() => {
    failureCountRef.current = 0;
    setStatus('ready');
  }, []);

  return { status, report, retry, reset };
}
