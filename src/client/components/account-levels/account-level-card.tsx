'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { isSnoozed, snooze } from '../../../lib/helper/local-storage.helper';
import { MissingList } from './missing-list';
import { NextStepAction } from './next-step-action';
import { useAccountLevel, type AccountLevelResponse } from './use-account-level';

export const ACCOUNT_LEVEL_CARD_SNOOZE_KEY = 'kizuna:account-level-card:snoozed';

type Props = {
  /** Status já calculado no servidor. Sem ele o card busca sozinho e entra animado ao carregar. */
  initial?: AccountLevelResponse | null;
  phoneEnabled: boolean;
  allLevelsHref?: string;
  /** Dias que o card fica escondido depois de fechado. Padrão 15. */
  snoozeDays?: number;
  snoozeKey?: string;
};

/**
 * Card do painel: nível atual, barra de progresso, próximo passo e o que ele libera. Só aparece
 * com conta incompleta; o usuário pode fechar e ele volta depois de `snoozeDays` (localStorage).
 */
export function AccountLevelCard({
  initial = null,
  phoneEnabled,
  allLevelsHref = '/painel/onboarding',
  snoozeDays = 15,
  snoozeKey = ACCOUNT_LEVEL_CARD_SNOOZE_KEY,
}: Props) {
  const { status, unlocks, refresh } = useAccountLevel({ initial });
  // Começa escondido: localStorage só existe no browser, e ler no render quebraria a hidratação.
  const [snoozed, setSnoozed] = useState(true);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setSnoozed(isSnoozed(snoozeKey));
  }, [snoozeKey]);

  const next = status?.next;
  const visible = Boolean(status && next && !snoozed);

  // Entrada de cima para baixo: monta no estado inicial (transparente, deslocado) e só no frame
  // seguinte troca para o final — assim a transition do Tailwind anima sem plugin de keyframes.
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  if (!status || !next || snoozed) return null;

  function dismiss() {
    snooze(snoozeKey, snoozeDays);
    setSnoozed(true);
  }

  const total = status.levels.length;
  const current = status.levels.find((l) => l.key === status.levelKey);
  const nextUnlocks = unlocks[next.key] ?? [];

  return (
    <section
      className={cn(
        'relative rounded-[var(--ui-radius-card-lg,1.5rem)] border border-border bg-card p-4 transition-all duration-500 ease-out motion-reduce:transition-none sm:px-6 sm:py-5',
        entered ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      )}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={`Fechar por ${snoozeDays} dias`}
        title={`Esconder por ${snoozeDays} dias`}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-7 sm:w-7"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>

      {/* Mobile: só o nível no topo (o link vai para o rodapé). sm+: nível e link na mesma linha. */}
      <div className="flex min-h-8 items-center justify-between gap-3 pr-10">
        <p className="text-sm text-muted-foreground">
          Nivel {status.level} de {total}
          {current ? (
            <>
              {' '}
              · <strong className="text-foreground">{current.title}</strong>
            </>
          ) : null}
        </p>
        <Link
          href={allLevelsHref}
          className="hidden shrink-0 text-sm text-primary underline underline-offset-4 hover:decoration-2 sm:inline"
        >
          Ver todos os niveis
        </Link>
      </div>

      <div className="mt-3 flex gap-1" aria-hidden>
        {status.levels.map((l) => (
          <span
            key={l.key}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              l.reached ? 'bg-primary' : 'bg-muted',
              l.enabled === false && 'opacity-40'
            )}
          />
        ))}
      </div>

      <div className="mt-4">
        <p className="font-medium">Proximo: {next.title}</p>
        <MissingList items={next.missing} className="text-sm" />
        {nextUnlocks.length ? (
          <p className="mt-2 text-sm">
            Libera: <span className="text-muted-foreground">{nextUnlocks.join(', ')}</span>
          </p>
        ) : null}
        <NextStepAction level={next} phoneEnabled={phoneEnabled} onDone={() => void refresh()} />
        <Link
          href={allLevelsHref}
          className="mt-3 block text-sm text-primary underline underline-offset-4 hover:decoration-2 sm:hidden"
        >
          Ver todos os niveis
        </Link>
      </div>
    </section>
  );
}
