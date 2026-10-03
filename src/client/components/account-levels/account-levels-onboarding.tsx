'use client';

import { useRouter } from 'next/navigation';
import type { CanResult } from '../../../shared/account-levels';
import { AccountLevelsPanel } from './account-levels-panel';
import type { AccountLevelResponse } from './use-account-level';

type Props = {
  initial: AccountLevelResponse;
  /** Ação que trouxe o usuário (bloqueio de página ou `?acao=`): destaca o nível exigido. */
  blocked?: CanResult | null;
  actionLabel?: string | null;
  phoneEnabled?: boolean;
  title?: string;
  description?: string;
};

/**
 * Tela padrão "evolua sua conta" — a MESMA em /painel/onboarding e em qualquer página barrada por
 * `RequireLevel` (ex.: /painel/meus-servicos/novo). Cada pendência leva à tela onde se resolve
 * (`MissingList`). Concluir um passo inline dá `router.refresh()`: numa página barrada, o servidor
 * recalcula e, se liberou, entrega o conteúdo.
 */
export function AccountLevelsOnboarding({
  initial,
  blocked = null,
  actionLabel = null,
  phoneEnabled = false,
  title = 'Evolua sua conta',
  description = 'Cada nivel libera mais coisas. Voce so precisa completar quando quiser usar.',
}: Props) {
  const router = useRouter();
  const isBlocked = Boolean(blocked && !blocked.allowed && blocked.required);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      {isBlocked ? (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
          Para <strong>{(actionLabel ?? 'continuar').toLowerCase()}</strong>, chegue ao nivel{' '}
          <strong>{blocked!.required!.title}</strong>.
        </p>
      ) : null}

      <AccountLevelsPanel
        initial={initial}
        highlightLevelKey={isBlocked ? (blocked!.required?.key ?? null) : null}
        phoneEnabled={phoneEnabled}
        onStepDone={() => router.refresh()}
      />
    </div>
  );
}
