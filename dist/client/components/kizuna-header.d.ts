import { type TopbarNavLink } from './topbar';
export type KizunaHeaderVariant = 'classic' | 'compact';
export type KizunaHeaderProps = {
    navLinks?: TopbarNavLink[];
    authCta?: 'split' | 'single';
    loginHref?: string;
    showThemeToggle?: boolean;
    /** Sobrescreve a env `KIZUNA_HEADER_VARIANT` (default 'classic'). */
    variant?: KizunaHeaderVariant;
    /** Só na variante 'compact'. */
    eyebrow?: string;
    brandLabel?: string;
    searchHref?: string;
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
export declare function KizunaHeader({ variant, eyebrow, brandLabel, searchHref, ...topbarProps }?: KizunaHeaderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=kizuna-header.d.ts.map