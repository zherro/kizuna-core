'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import type { AccountStatus, CanResult } from '../../../shared/account-levels';
import { NextStepAction } from './next-step-action';

type Props = {
  can: CanResult;
  status: AccountStatus;
  /** Rótulo humano da ação ("Publicar anuncios"). */
  actionLabel: string;
  phoneEnabled: boolean;
  allLevelsHref?: string;
};

/**
 * Tela padrão de "falta nível" — renderizada pelo `RequireLevel` na MESMA URL. Ao completar um
 * passo, `router.refresh()`: o servidor recalcula e, se liberou, entrega o conteúdo.
 */
export function LevelBlockedScreen({
  can,
  status,
  actionLabel,
  phoneEnabled,
  allLevelsHref = '/painel/onboarding',
}: Props) {
  const router = useRouter();
  const requiredLevel = can.required?.level ?? 1;
  const steps = status.levels.filter((l) => l.level <= requiredLevel);
  const firstPending = steps.find((l) => !l.reached);

  function onStepDone() {
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Para {actionLabel.toLowerCase()}, falta pouco</h1>
          {can.required ? (
            <p className="text-sm text-muted-foreground">
              Chegue ao nivel {can.required.level} · {can.required.title}
            </p>
          ) : null}
        </div>
      </div>

      {can.required?.enabled === false ? (
        <p className="text-sm text-muted-foreground">Este nivel ainda nao esta disponivel. Em breve!</p>
      ) : (
        <ol className="space-y-3">
          {steps.map((l) => (
            <li key={l.key} className="rounded-[var(--ui-radius-card-sm,0.5rem)] border border-border p-4">
              <div className="flex items-start gap-3">
                {l.reached ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {l.level}. {l.title}
                  </p>
                  {!l.reached && l.missing.length ? (
                    <p className="mt-1 text-xs text-muted-foreground">Falta: {l.missing.join(', ')}</p>
                  ) : null}
                  {firstPending?.key === l.key ? (
                    <NextStepAction level={l} phoneEnabled={phoneEnabled} onDone={onStepDone} />
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Link href={allLevelsHref} className="inline-block text-sm text-primary hover:underline">
        Ver todos os niveis
      </Link>
    </div>
  );
}
