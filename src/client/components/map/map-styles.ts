import { Calendar, Clapperboard, MapPin, Music, Palette, Star, Utensils, Wine, type LucideIcon } from 'lucide-react';

/** Ícones disponíveis para os pinos; o projeto escolhe pela chave (serializável) em `groupStyles`. */
export const MAP_ICONS = {
  calendar: Calendar,
  film: Clapperboard,
  'map-pin': MapPin,
  music: Music,
  palette: Palette,
  star: Star,
  utensils: Utensils,
  wine: Wine,
} as const satisfies Record<string, LucideIcon>;

export type MapIconKey = keyof typeof MAP_ICONS;

export type MapGroupStyle = {
  /** Nome curto para a legenda. */
  label: string;
  /** Cor do pino (qualquer cor CSS). */
  color: string;
  icon: MapIconKey;
};

/** `category_group_slug` → estilo do pino. Grupo sem entrada usa a cor da marca, sem ícone. */
export type MapGroupStyles = Record<string, MapGroupStyle>;

export const DEFAULT_PIN_COLOR = 'var(--brand, #e4572e)';

export function pinStyleFor(groupSlug: string | null | undefined, styles?: MapGroupStyles): { color: string; Icon: LucideIcon | null } {
  const s = groupSlug && styles ? styles[groupSlug] : undefined;
  return { color: s?.color ?? DEFAULT_PIN_COLOR, Icon: s ? (MAP_ICONS[s.icon] ?? null) : null };
}
