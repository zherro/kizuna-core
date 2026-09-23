// Temas de cor disponíveis. Módulo sem 'use client' para poder ser lido também no
// servidor (ex.: layout.tsx validando a chave "theme" do kizuna.config.json).
export const THEME_COLORS = [
  'blue',
  'green',
  'purple',
  'teal',
  'red',
  'orange',
  'coral',
  'terracotta',
  'bora_cuiaba',
  'metro_orange',
  'laranja_intenso',
  'laranja_medio',
] as const;

export type AppThemeColor = (typeof THEME_COLORS)[number];

export function isThemeColor(value: unknown): value is AppThemeColor {
  return typeof value === 'string' && (THEME_COLORS as readonly string[]).includes(value);
}
