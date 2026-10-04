'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../providers/auth-provider';

// `icon` takes a rendered element (e.g. `<Search />`), not a component reference — that's what
// keeps it safe to pass from a Server Component consumer (RootLayout) across the client boundary.
export type MobileTabItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Prefixos de rota que deixam o item ativo. Padrão: o próprio `href` (por prefixo de segmento). */
  match?: string[];
  /** Ativo só quando o pathname é exatamente `href` (evita "Meus anúncios" ativo em `/…/novo`). */
  exact?: boolean;
  /** Visitante anônimo vai para `/login?returnTo=<href>` em vez do destino. */
  requiresAuth?: boolean;
  /** Botão redondo elevado no meio da barra — o CTA principal. */
  featured?: boolean;
  /** Prefixos de rota onde o item aparece; fora deles some. Ex.: "Meus anúncios" só no painel. */
  onlyOn?: string[];
  /** Prefixos de rota onde o item some. Ex.: "Meu painel" fora do painel. */
  exceptOn?: string[];
};

export interface MobileTabBarProps {
  items: MobileTabItem[];
  /**
   * Conjunto alternativo para o visitante anônimo (ex.: "Entrar" no lugar de "Conta"). Só vale com
   * a sessão já resolvida — enquanto carrega, mostra `items` para não piscar "Entrar" a quem está
   * logado. Sem ele, o anônimo vê `items` e os itens `requiresAuth` levam ao login.
   */
  guestItems?: MobileTabItem[];
  /** Prefixos de rota onde a barra some (wizards com rodapé próprio, onboarding…). Default: []. */
  hideOn?: string[];
  className?: string;
}

/** Altura da barra sem a safe-area — o `--mobile-tab-h` publicado no <html> soma a safe-area. */
const BAR_HEIGHT = '4rem';
const TAB_HEIGHT_VAR = '--mobile-tab-h';

function matchesPrefix(prefix: string, pathname: string) {
  if (prefix === '/') return pathname === '/';
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isTabVisible(
  item: Pick<MobileTabItem, 'onlyOn' | 'exceptOn'>,
  pathname: string
): boolean {
  if (item.onlyOn && !item.onlyOn.some((prefix) => matchesPrefix(prefix, pathname))) return false;
  if (item.exceptOn?.some((prefix) => matchesPrefix(prefix, pathname))) return false;
  return true;
}

export function isTabActive(
  item: Pick<MobileTabItem, 'href' | 'match' | 'exact'>,
  pathname: string
): boolean {
  if (item.match) return item.match.some((prefix) => matchesPrefix(prefix, pathname));
  if (item.exact) return pathname === item.href;
  return matchesPrefix(item.href, pathname);
}

/**
 * Barra de navegação inferior do mobile (visível só abaixo de `md`). Genérica: os itens vêm por
 * prop. Enquanto montada, publica `--mobile-tab-h` no `<html>` (altura + safe-area) para o layout
 * reservar espaço (`pb-[var(--mobile-tab-h,0px)]`) e para elementos `fixed bottom` subirem acima dela.
 * Fica em z-20: abaixo do drawer do painel (z-50), do overlay (z-40) e do chat da busca (z-30).
 */
export function MobileTabBar({ items, guestItems, hideOn = [], className }: MobileTabBarProps) {
  const pathname = usePathname() ?? '';
  const { user, loading } = useAuth();
  const isGuest = !user && !loading;
  const visibleItems = (isGuest && guestItems ? guestItems : items).filter((item) =>
    isTabVisible(item, pathname)
  );
  const hidden = hideOn.some((prefix) => matchesPrefix(prefix, pathname));

  useEffect(() => {
    if (hidden) return;
    const root = document.documentElement;
    root.style.setProperty(TAB_HEIGHT_VAR, `calc(${BAR_HEIGHT} + env(safe-area-inset-bottom))`);
    return () => {
      root.style.removeProperty(TAB_HEIGHT_VAR);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <ul className="grid h-16 grid-cols-5">
        {visibleItems.map((item) => {
          const active = isTabActive(item, pathname);
          // Enquanto a sessão hidrata (`loading`) não mandamos ninguém ao login — o gate da página decide.
          const href =
            item.requiresAuth && isGuest
              ? `/login?returnTo=${encodeURIComponent(item.href)}`
              : item.href;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium leading-tight',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {item.featured ? (
                  <span
                    className={cn(
                      '-mt-4 flex h-[2.16rem] w-[2.16rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background',
                      '[&>svg]:h-[1.08rem] [&>svg]:w-[1.08rem]'
                    )}
                  >
                    {item.icon}
                  </span>
                ) : (
                  <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
                )}
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
