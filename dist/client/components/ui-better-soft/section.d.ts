import type { ReactNode } from 'react';
type SectionVariant = 'default' | 'compact' | 'flat';
type SectionProps = {
    /** Sem `icon`/`title`, a seção vira um card simples — o wrapper é o mesmo, só sem cabeçalho. */
    icon?: ReactNode;
    title?: string;
    description?: string;
    /**
     * `default` (com cabeçalho, ex.: bloco de configurações), `compact` (sem cabeçalho, item de
     * lista, ex.: card de compromisso) ou `flat` (wrapper maior, ex.: calendário inline).
     */
    variant?: SectionVariant;
    /** Cor CSS que tinge a borda via `color-mix`, para destacar um item específico. */
    accentColor?: string;
    className?: string;
    children: ReactNode;
};
/**
 * Card do kit `ui-better-soft` — com ou sem cabeçalho (ícone + título + descrição). O visual
 * (raio, borda, sombra) vem de `activeTheme`, resolvido uma vez por deployment via
 * `NEXT_PUBLIC_UI_STYLE`; este é o único componente de card do kit, não existe uma variante
 * paralela "soft".
 */
export declare function Section({ icon, title, description, variant, accentColor, className, children, }: Readonly<SectionProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=section.d.ts.map