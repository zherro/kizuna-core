// Fontes de título (Typography font="display") escolhíveis por config — lista curada, igual a
// THEME_COLORS: cada nome precisa de um next/font carregado no layout do consumidor e de um bloco
// :root[data-display-font='<nome>'] no globals.css apontando --ui-font-display-active pra ela.
// Módulo sem 'use client' para ser lido no servidor (layout.tsx valida theme.displayFont).
export const DISPLAY_FONTS = ['quicksand', 'baloo', 'bricolage'] as const;

export type DisplayFont = (typeof DISPLAY_FONTS)[number];

export function isDisplayFont(value: unknown): value is DisplayFont {
  return typeof value === 'string' && (DISPLAY_FONTS as readonly string[]).includes(value);
}
