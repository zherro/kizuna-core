import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AccountLevelsOnboarding } from '../client/components/account-levels/account-levels-onboarding';
import { getAccountLevelView, type AccountLevelsSetup } from './account-levels';
import { getSession } from './auth';

type Props = {
  setup: AccountLevelsSetup;
  action: string;
  /** URL atual, para voltar depois do login. */
  returnTo: string;
  phoneEnabled?: boolean;
  children: ReactNode;
};

/**
 * Barreira de nível padrão para páginas. Liberado → children. Bloqueado → a mesma tela de
 * /painel/onboarding (`AccountLevelsOnboarding`), com o nível exigido destacado, na mesma URL (ao
 * completar, o refresh entrega o conteúdo). Sem sessão → login com retorno.
 */
export async function RequireLevel({ setup, action, returnTo, phoneEnabled = false, children }: Props) {
  const session = await getSession();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);

  const view = await getAccountLevelView(setup, action);
  if (view.blocked?.allowed) return <>{children}</>;

  return (
    <AccountLevelsOnboarding
      initial={{ status: view.status, allowed: view.allowed }}
      blocked={view.blocked}
      actionLabel={view.actionLabel}
      phoneEnabled={phoneEnabled}
    />
  );
}
