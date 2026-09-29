/**
 * Tema visual único, resolvido uma vez por deployment via env var — não há alternância em
 * runtime nem por usuário. `ui-better-soft/*` continua sendo um único conjunto de componentes;
 * o que muda entre "classic" e "soft" é a forma (raio, borda, sombra, fundo), que vem de tokens
 * CSS `--ui-*` definidos por `data-ui-style` no globals.css do projeto, nunca de um componente
 * paralelo. Só a escala tipográfica dos headings, que não é token CSS, segue `ACTIVE_UI_STYLE`
 * dentro do próprio componente.
 *
 * `ACTIVE_UI_STYLE` vira `<html data-ui-style>` no root layout, resolvido no servidor,
 * sem flash.
 */

export type UiStyle = 'classic' | 'soft';

export const UI_STYLES: readonly UiStyle[] = ['classic', 'soft'];

export function resolveUiStyle(): UiStyle {
  const raw = (process.env.NEXT_PUBLIC_UI_STYLE ?? '').trim().toLowerCase();
  return raw === 'soft' ? 'soft' : 'classic';
}

/** Resolvido uma vez, no load do módulo — estático por deployment, nunca muda em runtime. */
export const ACTIVE_UI_STYLE: UiStyle = resolveUiStyle();
