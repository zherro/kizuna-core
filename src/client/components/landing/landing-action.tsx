'use client';

import Link from 'next/link';
import { Megaphone, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../providers/auth-provider';
import { FOCUS_RING } from './landing-ui';

/**
 * Destino de uma ação que exige conta: o visitante anônimo vai para `/login?returnTo=<href>` e volta
 * ao destino depois de entrar (mesma regra do item `requiresAuth` da barra inferior). Enquanto a
 * sessão hidrata (`isGuest` falso), aponta direto — o gate da página manda ao login se precisar.
 */
export function authAwareHref(href: string, isGuest: boolean): string {
  return isGuest ? `/login?returnTo=${encodeURIComponent(href)}` : href;
}

/**
 * Botão principal das páginas de captação ("Anunciar grátis"): leva ao fluxo de criar anúncio,
 * passando pelo login quando o visitante não está logado. Mesmo visual do `WhatsAppButton` sólido,
 * na mesma aba e sem prefetch (o destino é dinâmico, atrás de sessão). Alvo de toque ≥ 48px.
 */
export function LandingAuthAction({
  href,
  label,
  icon: Icon = Megaphone,
  className = '',
  ...rest
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  const { user, loading } = useAuth();
  const isGuest = !user && !loading;
  return (
    <Link
      href={authAwareHref(href, isGuest)}
      prefetch={false}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-md shadow-primary/25 hover:brightness-95 motion-safe:transition ${FOCUS_RING} ${className}`}
      {...rest}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}
