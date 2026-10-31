import type { TopbarNavLink } from './topbar';
export type TopbarCompactProps = {
    navLinks?: TopbarNavLink[];
    authCta?: 'split' | 'single';
    loginHref?: string;
    showThemeToggle?: boolean;
    /** Linha pequena acima do label (ex.: "Você está em"). */
    eyebrow?: string;
    /** Label da marca/localização (ex.: "Centro, sua cidade"). */
    brandLabel?: string;
    /** href do botão de busca. Se ausente, o botão não aparece. */
    searchHref?: string;
};
/**
 * Cabeçalho compacto — variante do `Topbar`. Marca curta com pino, nav central,
 * botão de busca redondo. Mesmas props de nav/auth do `Topbar`; some em `/painel`.
 * Todo tokenizado (troca de tema/cor afeta igual).
 */
export declare function TopbarCompact({ navLinks, authCta, loginHref, showThemeToggle, eyebrow, brandLabel, searchHref, }?: TopbarCompactProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=topbar-compact.d.ts.map