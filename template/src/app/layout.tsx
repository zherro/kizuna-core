import type { Metadata, Viewport } from 'next';
import { Roboto, Geist_Mono, Bricolage_Grotesque } from 'next/font/google';
import { Megaphone, Search } from 'lucide-react';
import { PwaRegister } from '@kizuna/core/client/components/pwa-register';
import { PreferencesFab } from '@kizuna/core/client/components/preferences-fab';
import { AppPreferencesProvider } from '@kizuna/core/client/providers/app-preferences-provider';
import { AuthProvider } from '@kizuna/core/client/providers/auth-provider';
import { Topbar } from '@kizuna/core/client/components/topbar';
import { Footer } from '@/components/footer';
import { Toaster } from 'sonner';
import './globals.css';
import { getSession, checkKizunaEnv } from '@kizuna/core/server';
import { SetupRequiredScreen } from '@kizuna/core/client/components/setup-required-screen';
import { getAppPreferencesFabVisible } from '@/lib/server/app-preferences-config';

// Este layout já é dinâmico: `getSession()` lê `cookies()`. Não force
// `dynamic = 'force-dynamic'` — isso trava static/ISR também para quem, no
// futuro, tornar o layout raiz sem cookie (páginas públicas estáticas — ver
// docs/HARDENING.md, "layout público"). A trava de ambiente também roda no
// proxy (createKizunaProxy), então não depende deste render.

// Match the reference template: Roboto (Google Fonts wght 400/500/700/900).
const robotoSans = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Display face for the home hero and section headings — a characterful grotesque,
// deliberately distinct from Roboto (body/UI). Only heavy weights are loaded.
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Foco Total',
  description: 'Plataforma de servicos com multitema e multilinguagem',
  applicationName: 'Foco Total',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Foco Total',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TRAVA kizuna — não remova. Sem PostgREST + segredo de JWT o app não sobe.
  const env = checkKizunaEnv();
  if (!env.ok) {
    return (
      <html lang="pt-BR" suppressHydrationWarning>
        <body suppressHydrationWarning>
          <SetupRequiredScreen missing={env.missing} />
        </body>
      </html>
    );
  }

  const session = await getSession();
  const fabVisible = await getAppPreferencesFabVisible();
  // Logged-in users go straight to the service wizard; visitors get the
  // "become a provider" pitch + login first.
  const anunciarHref = session ? '/painel/meus-servicos/novo' : '/seja-prestador';
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
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${robotoSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground"
      >
        <AppPreferencesProvider>
          <AuthProvider initialUser={initialUser}>
            <PwaRegister swUrl="/sw.js?v=2" migrationKey="foco-total-sw-migration-v2" />
            <Topbar
              showThemeToggle={false}
              authCta="single"
              navLinks={[
                { href: '/busca', label: 'Buscar', icon: <Search /> },
                { href: anunciarHref, label: 'Anunciar', icon: <Megaphone /> },
              ]}
            />
            <main className="flex-1">{children}</main>
            <Footer />
            {fabVisible ? <PreferencesFab /> : null}
            <Toaster richColors position="bottom-center" />
          </AuthProvider>
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
