import { redirect } from 'next/navigation';
import { getSession } from '@kizuna/core/server';
import { PanelShell } from '@/components/panel-shell';

export default async function PainelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <PanelShell>{children}</PanelShell>;
}
