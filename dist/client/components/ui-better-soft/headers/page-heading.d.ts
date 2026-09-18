import type { ReactNode } from 'react';
type PageHeadingProps = {
    eyebrow?: string;
    title: string;
    description?: ReactNode;
    className?: string;
};
/**
 * Heading simples de topo de tela (saudação, sem ações) — diferente de `PageHeader`/
 * `AdminPageReader`, que são cabeçalhos de página de listagem/gestão com ações à direita.
 * Tamanho/peso do título vêm de `activeTheme`, resolvido por `NEXT_PUBLIC_UI_STYLE`.
 */
export declare function PageHeading({ eyebrow, title, description, className, }: Readonly<PageHeadingProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=page-heading.d.ts.map