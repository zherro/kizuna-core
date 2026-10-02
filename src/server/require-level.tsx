import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { canDo } from '../shared/account-levels';
import { LevelBlockedScreen } from '../client/components/account-levels/level-blocked-screen';
import { getAccountStatus, type AccountLevelsSetup } from './account-levels';
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
 * Barreira de nível padrão para páginas. Liberado → children. Bloqueado → tela de "falta nível"
 * na mesma URL (ao completar, o refresh entrega o conteúdo). Sem sessão → login com retorno.
 */
export async function RequireLevel({ setup, action, returnTo, phoneEnabled = false, children }: Props) {
  const session = await getSession();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);

  const status = await getAccountStatus(setup);
  const can = canDo(status, setup.capabilities, action);
  if (can.allowed) return <>{children}</>;

  return (
    <LevelBlockedScreen
      can={can}
      status={status}
      actionLabel={setup.labels?.[action] ?? 'continuar'}
      phoneEnabled={phoneEnabled}
    />
  );
}
