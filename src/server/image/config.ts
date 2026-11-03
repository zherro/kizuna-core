import cfg from '@/../kizuna.config.json';
import { resolveThumbPreset } from '../../shared/image';

/**
 * Preset da miniatura do projeto: `images.thumbPreset` do kizuna.config.json (xl | lg | md | sm | xs;
 * ausente ou inválido = o padrão de `shared/image/thumb-presets.json`). Lido pelo próprio core, como
 * `regions` (mesmo alias `@/`), e usado por TODO upload de imagem. Só servidor.
 */
export const projectThumbPreset = resolveThumbPreset(
  (cfg as { images?: { thumbPreset?: unknown } }).images?.thumbPreset
);
