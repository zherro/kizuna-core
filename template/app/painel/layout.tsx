// EXEMPLO — reescreva. Guarda de sessão do painel. Troque o <div> pela sua
// shell de painel (navegação lateral, header etc.).
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@kizuna/core/server';

export default async function PainelLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return <div className="min-h-screen">{children}</div>;
}
