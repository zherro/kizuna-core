// EXEMPLO — reescreva. Casca mínima: só os providers irredutíveis.
// Adicione fontes, Topbar/Footer, PWA, metadata etc. conforme o seu app.
// Preferências de tema/locale: o plugin `account_preferences` traz o
// AppPreferencesProvider — ele depende de `src/i18n/messages.ts` no seu projeto.
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@kizuna/core/client/providers/auth-provider';
import { getSession } from '@kizuna/core/server';
import './globals.css';

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await getSession();
  const initialUser = session
    ? {
        user_id: session.user_id,
        display_name: session.display_name,
        login: session.login,
        tenant_type: session.tenant_type,
        perms: session.perms,
        is_root: session.is_root,
      }
    : null;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider initialUser={initialUser}>
          {children}
          <Toaster richColors position="bottom-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
