/**
 * Regras de imagem que valem no cliente e no servidor (sem `sharp` — pode ir pro bundle do browser).
 * O servidor (`server/image`) usa as mesmas para decidir miniatura e aviso de baixa resolução.
 */

import thumbPresetsJson from './thumb-presets.json';

/**
 * Presets da miniatura (`/content?size=thumb`, a capa dos cards). Os valores moram em
 * `thumb-presets.json` (lido também pelos scripts de importação); o projeto escolhe um em
 * `kizuna.config.json` → `images.thumbPreset`. Ver docs/servicos/storage.md.
 */
export type ThumbPresetName = 'xl' | 'lg' | 'md' | 'sm' | 'xs';
export type ThumbPresetConfig = { name: ThumbPresetName; side: number; quality: number };

export const THUMB_PRESET_NAMES = Object.keys(thumbPresetsJson.presets) as ThumbPresetName[];

export function isThumbPresetName(value: unknown): value is ThumbPresetName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(thumbPresetsJson.presets, value);
}

/** Nome desconhecido (ou ausente) → o preset padrão do JSON. Nunca lança. */
export function resolveThumbPreset(name?: unknown): ThumbPresetConfig {
  const key: ThumbPresetName = isThumbPresetName(name) ? name : (thumbPresetsJson.default as ThumbPresetName);
  const { side, quality } = thumbPresetsJson.presets[key];
  return { name: key, side, quality };
}

/**
 * Marca da medida de uma miniatura (`files.thumb_spec`, storage 0007): `<lado>q<qualidade>`, ex.
 * `360q60`. Guardar isto por imagem deixa saber o que já está na medida configurada e o que ficou
 * desatualizado depois de trocar o preset. Mesmo formato dos scripts (`scripts/lib/thumb-preset.mjs`).
 */
export function thumbSpec(preset: Pick<ThumbPresetConfig, 'side' | 'quality'>): string {
  return `${preset.side}q${preset.quality}`;
}

/** Maior lado da miniatura do preset padrão (o do projeto vem de `resolveThumbPreset`). */
export const THUMB_MAX_SIDE = resolveThumbPreset().side;

export type ImagePreset = 'avatar' | 'listing' | 'default' | 'thumb';

export type ImagePresetConfig = { width: number; height: number; fit: 'cover' | 'inside'; quality: number };

export const IMAGE_PRESETS: Record<ImagePreset, ImagePresetConfig> = {
  avatar: { width: 512, height: 512, fit: 'cover', quality: 80 },
  listing: { width: 1600, height: 1600, fit: 'inside', quality: 80 },
  default: { width: 2048, height: 2048, fit: 'inside', quality: 82 },
  // Miniatura no preset PADRÃO (cards, busca, carrosséis, galeria). O upload usa o preset do projeto
  // (`images.thumbPreset`, via `resolveThumbPreset`); esta entrada só serve a quem pede 'thumb' direto.
  thumb: {
    width: resolveThumbPreset().side,
    height: resolveThumbPreset().side,
    fit: 'inside',
    quality: resolveThumbPreset().quality,
  },
};

/** `purpose` do upload → preset (avatar → avatar; foto de anúncio → listing; resto → default). */
export function presetForPurpose(purpose?: string | null): ImagePreset {
  if (purpose === 'avatar') return 'avatar';
  if (purpose === 'ad_image' || purpose === 'service_image' || purpose === 'listing') return 'listing';
  return 'default';
}

/** Abaixo disso (no lado menor) a foto tende a ficar borrada no detalhe — o upload avisa. */
export const LOW_RESOLUTION_MIN_SIDE = 600;

/** Lado menor abaixo de `LOW_RESOLUTION_MIN_SIDE` (dimensões desconhecidas → `false`). */
export function isLowResolution(width: number | null | undefined, height: number | null | undefined): boolean {
  if (width == null || height == null) return false;
  return Math.min(width, height) < LOW_RESOLUTION_MIN_SIDE;
}

/** Só vale miniatura se a imagem passar do tamanho dela (`side`, padrão: o do preset padrão) em algum lado. */
export function needsThumbnail(
  width: number | null | undefined,
  height: number | null | undefined,
  side: number = THUMB_MAX_SIDE
): boolean {
  return width != null && height != null && (width > side || height > side);
}
