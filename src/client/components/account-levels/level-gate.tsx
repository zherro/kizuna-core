'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import type { CanResult } from '../../../shared/account-levels';
import { fetchAccountLevel } from './use-account-level';
import { MissingList } from './missing-list';

type LevelGate = (action: string, run: () => void) => Promise<void>;
const Ctx = createContext<LevelGate | null>(null);

type Props = {
  children: React.ReactNode;
  /** Tela com a escada de níveis. */
  onboardingHref?: string;
};

/**
 * `useLevelGate()(acao, fn)`: roda `fn` se o nível da conta libera a ação; senão abre o modal
 * "Evolua sua conta" mostrando só o que falta. Só UX — a barreira real é `canDoServer`.
 * Se a consulta falhar, NÃO roda a ação (fecha por padrão) e manda para o onboarding.
 */
export function LevelGateProvider({ children, onboardingHref = '/painel/onboarding' }: Props) {
  const [blocked, setBlocked] = useState<CanResult | null>(null);

  const gate = useCallback<LevelGate>(async (action, run) => {
    const res = await fetchAccountLevel(action);
    if (res?.can?.allowed) {
      run();
      return;
    }
    setBlocked(res?.can ?? { allowed: false, action, required: null, pending: [] });
  }, []);

  return (
    <Ctx.Provider value={gate}>
      {children}
      {blocked ? (
        <LevelUpDialog
          can={blocked}
          onboardingHref={onboardingHref}
          onClose={() => setBlocked(null)}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useLevelGate(): LevelGate {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLevelGate precisa de <LevelGateProvider>');
  return ctx;
}

export function LevelUpDialog({
  can,
  onClose,
  onboardingHref = '/painel/onboarding',
}: {
  can: CanResult;
  onClose: () => void;
  onboardingHref?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const target = `${onboardingHref}?acao=${encodeURIComponent(can.action)}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        className="w-full max-w-md rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-[color:var(--ui-card-bg,var(--background))] p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-4 w-4" />
            </span>
            <h2 id="level-up-title" className="text-base font-semibold">
              Evolua sua conta
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-[var(--ui-radius-pill,0.375rem)] p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {can.required
            ? `Para isso voce precisa chegar ao nivel "${can.required.title}".`
            : 'Entre na sua conta para continuar.'}
        </p>

        {can.pending.length ? (
          <ol className="mb-5 space-y-3">
            {can.pending.map((l) => (
              <li key={l.key} className="rounded-[var(--ui-radius-card-sm,0.5rem)] border-[length:var(--ui-border-w-card,1px)] border-border p-3 shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]">
                <p className="text-sm font-medium">
                  {l.level}. {l.title}
                </p>
                <MissingList items={l.missing} className="mt-1" />
              </li>
            ))}
          </ol>
        ) : null}

        {can.required?.enabled === false ? (
          <p className="text-sm text-muted-foreground">
            Este nivel ainda nao esta disponivel. Em breve!
          </p>
        ) : (
          <Link
            href={can.required ? target : '/login'}
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center rounded-[var(--ui-radius-pill,0.375rem)] bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {can.required ? 'Evoluir minha conta' : 'Entrar'}
          </Link>
        )}
      </div>
    </div>
  );
}
