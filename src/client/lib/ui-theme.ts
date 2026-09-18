/**
 * Tema visual único, resolvido uma vez por deployment via env var — não há alternância em
 * runtime nem por usuário. `ui-better-soft/*` continua sendo um único conjunto de componentes;
 * o que muda entre "classic" e "soft" é só o conjunto de classes/propriedades que cada um lê
 * daqui, nunca um componente paralelo.
 */

export type UiStyle = 'classic' | 'soft';

export const UI_STYLES: readonly UiStyle[] = ['classic', 'soft'];

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
  headingTitleSize: { base: TypographySize };
  headingTitleWeight: TypographyWeight;
  /** Tamanho/peso do título de `PageHeader` (cabeçalho de listagem/gestão, com ações). */
  pageHeaderTitleSize: { base: TypographySize };
  pageHeaderTitleWeight: TypographyWeight;
};

export const UI_THEME: Record<UiStyle, UiThemeTokens> = {
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

function resolveUiStyle(): UiStyle {
  const raw = (process.env.NEXT_PUBLIC_UI_STYLE ?? '').trim().toLowerCase();
  return raw === 'soft' ? 'soft' : 'classic';
}

/** Resolvido uma vez, no load do módulo — estático por deployment, nunca muda em runtime. */
export const ACTIVE_UI_STYLE: UiStyle = resolveUiStyle();

export const activeTheme: UiThemeTokens = UI_THEME[ACTIVE_UI_STYLE];
