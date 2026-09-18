/**
 * Tema visual único, resolvido uma vez por deployment via env var — não há alternância em
 * runtime nem por usuário. `ui-better-soft/*` continua sendo um único conjunto de componentes;
 * o que muda entre "classic" e "soft" é só o conjunto de classes/propriedades que cada um lê
 * daqui, nunca um componente paralelo.
 */
export type UiStyle = 'classic' | 'soft';
export declare const UI_STYLES: readonly UiStyle[];
type TypographySize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
type TypographyWeight = 'normal' | 'medium' | 'semibold' | 'bold';
type UiThemeTokens = {
    /** Card com cabeçalho (ícone + título + descrição) — o `Section` original. */
    card: string;
    /** Card compacto sem cabeçalho, para item de lista (ex.: card de compromisso). */
    cardCompact: string;
    /** Card maior/wrapper (ex.: calendário inline). */
    cardFlat: string;
    /** Chip circular de cor (hora, categoria). */
    chip: string;
    /** Botão de ação flutuante fixo no rodapé. */
    fab: string;
    /** Gatilho do popover que substitui o `<select>` nativo no mobile. */
    selectTrigger: string;
    /** Painel do popover de seleção. */
    selectPanel: string;
    /** Folha de um modal ancorado embaixo (bottom sheet). */
    bottomSheet: string;
    /** Tamanho/peso do título de um heading de página simples (saudação, sem ações). */
    headingTitleSize: {
        base: TypographySize;
    };
    headingTitleWeight: TypographyWeight;
    /** Tamanho/peso do título de `PageHeader` (cabeçalho de listagem/gestão, com ações). */
    pageHeaderTitleSize: {
        base: TypographySize;
    };
    pageHeaderTitleWeight: TypographyWeight;
};
export declare const UI_THEME: Record<UiStyle, UiThemeTokens>;
/** Resolvido uma vez, no load do módulo — estático por deployment, nunca muda em runtime. */
export declare const ACTIVE_UI_STYLE: UiStyle;
export declare const activeTheme: UiThemeTokens;
export {};
//# sourceMappingURL=ui-theme.d.ts.map