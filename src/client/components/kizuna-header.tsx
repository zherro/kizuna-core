import type { ReactNode } from 'react';
import { Topbar, type TopbarNavLink } from './topbar';
import { TopbarCompact } from './topbar-compact';

export type KizunaHeaderVariant = 'classic' | 'compact';

export type KizunaHeaderProps = {
  navLinks?: TopbarNavLink[];
  authCta?: 'split' | 'single';
  loginHref?: string;
  /** URL da logo (ex.: "/brand/logo.png"); vale para as duas variantes. */
  brandLogo?: string;
  /** Conteúdo extra à direita, antes do login (ex.: widget de clima); vale para as duas variantes. */
  actions?: ReactNode;
  showThemeToggle?: boolean;
  /** Sobrescreve a env `KIZUNA_HEADER_VARIANT` (default 'classic'). */
  variant?: KizunaHeaderVariant;
  /** Só na variante 'compact'. */
  eyebrow?: string;
  brandLabel?: string;
  searchHref?: string;
  /** Só na variante 'compact': link de conta no mobile (logado). */
  accountLabel?: string;
  accountHref?: string;
};

/**
 * Escolhe o cabeçalho do site. A variante é fixada pelo PROJETO — via a env
 * `KIZUNA_HEADER_VARIANT=classic|compact` (ou a prop `variant`), lida no
 * servidor no render. Sem toggle por usuário, sem cookie, sem estado client:
 * a escolha é estática, então a página pública continua prerenderizável.
 * Ambas as variantes são 100% tokenizadas (tema/cor afeta as duas igual).
 *
 * Uso (layout raiz):
 *   <KizunaHeader navLinks={[{ href: '/busca', label: 'Buscar' }]} />
 */
export function KizunaHeader({
  variant,
  eyebrow,
  brandLabel,
  searchHref,
  accountLabel,
  accountHref,
  ...topbarProps
}: KizunaHeaderProps = {}) {
  const resolved: KizunaHeaderVariant =
    variant ?? (process.env.KIZUNA_HEADER_VARIANT === 'compact' ? 'compact' : 'classic');

  if (resolved === 'compact') {
    return (
      <TopbarCompact
        {...topbarProps}
        eyebrow={eyebrow}
        brandLabel={brandLabel}
        searchHref={searchHref}
        accountLabel={accountLabel}
        accountHref={accountHref}
      />
    );
  }
  return <Topbar {...topbarProps} />;
}
