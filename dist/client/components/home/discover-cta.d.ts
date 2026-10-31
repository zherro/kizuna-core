import type { ReactNode } from 'react';
export type DiscoverCtaProps = {
    href?: string;
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    /** aplica o container da home (max-w-6xl). Default true. */
    contained?: boolean;
    className?: string;
};
/**
 * Banner-CTA de destaque (gradiente da cor primária) — ex.: "Descobrir no swipe".
 * Tudo tokenizado (`from-primary` / `text-primary-foreground`), sem classe
 * custom. Texto e destino são props. Ligado por env (KIZUNA_HOME_DISCOVER).
 */
export declare function DiscoverCta({ href, title, subtitle, icon, contained, className, }: DiscoverCtaProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=discover-cta.d.ts.map