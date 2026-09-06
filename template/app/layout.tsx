// EXEMPLO — reescreva. Casca mínima: só os providers que o core espera.
// Adicione fontes, Topbar/Footer, PWA, metadata etc. conforme o seu app.
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AppPreferencesProvider } from '@kizuna/core/client/providers/app-preferences-provider';
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
        <AppPreferencesProvider>
          <AuthProvider initialUser={initialUser}>
            {children}
            <Toaster richColors position="bottom-center" />
          </AuthProvider>
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
