/**
 * Tema visual único, resolvido uma vez por deployment via env var — não há alternância em
 * runtime nem por usuário. `ui-better-soft/*` continua sendo um único conjunto de componentes;
 * o que muda entre "classic" e "soft" é só o conjunto de classes/propriedades que cada um lê
 * daqui, nunca um componente paralelo.
 */
export const UI_STYLES = ['classic', 'soft'];
export const UI_THEME = {
    classic: {
        card: 'rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6',
        cardCompact: 'rounded-xl border border-border bg-background p-3.5 shadow-sm',
        cardFlat: 'rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6',
        chip: 'rounded-lg',
        fab: 'h-12 w-12 rounded-full shadow-md',
        selectTrigger: 'rounded-md border border-border bg-background px-3 py-2',
        selectPanel: 'rounded-md border border-border bg-popover shadow-md',
        bottomSheet: 'w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-lg',
        headingTitleSize: { base: '2xl' },
        headingTitleWeight: 'bold',
        pageHeaderTitleSize: { base: 'xl' },
        pageHeaderTitleWeight: 'semibold',
    },
    soft: {
        // Sem borda por padrão — a separação vem da sombra/cor, não de um contorno. `Section` acrescenta
        // `border` só quando `accentColor` é passado (destaque pontual), nunca como base.
        // Sombra de 3 níveis (`--shadow-soft-1/2/3` em globals.css), maior conforme a superfície ganha
        // presença: item de lista < card com cabeçalho < wrapper grande (ex.: calendário).
        card: 'rounded-2xl bg-card p-5 shadow-[var(--shadow-soft-2)]',
        cardCompact: 'rounded-xl bg-card p-3.5 shadow-[var(--shadow-soft-1)]',
        cardFlat: 'rounded-3xl bg-card p-5 shadow-[var(--shadow-soft-3)]',
        chip: 'rounded-xl',
        fab: 'h-14 w-14 rounded-full shadow-lg',
        selectTrigger: 'rounded-xl bg-background px-3 py-2 shadow-sm',
        selectPanel: 'rounded-xl bg-card shadow-lg',
        bottomSheet: 'w-full max-w-md rounded-2xl bg-card p-5 shadow-lg',
        headingTitleSize: { base: '4xl' },
        headingTitleWeight: 'normal',
        pageHeaderTitleSize: { base: '2xl' },
        pageHeaderTitleWeight: 'normal',
    },
};
function resolveUiStyle() {
    const raw = (process.env.NEXT_PUBLIC_UI_STYLE ?? '').trim().toLowerCase();
    return raw === 'soft' ? 'soft' : 'classic';
}
/** Resolvido uma vez, no load do módulo — estático por deployment, nunca muda em runtime. */
export const ACTIVE_UI_STYLE = resolveUiStyle();
export const activeTheme = UI_THEME[ACTIVE_UI_STYLE];
//# sourceMappingURL=ui-theme.js.map