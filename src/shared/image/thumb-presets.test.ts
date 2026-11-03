import { describe, expect, it } from 'vitest';
import {
  THUMB_PRESET_NAMES,
  isThumbPresetName,
  needsThumbnail,
  resolveThumbPreset,
} from './index';

describe('presets da miniatura', () => {
  it('tem os 5 presets, do maior para o menor', () => {
    expect(THUMB_PRESET_NAMES).toEqual(['xl', 'lg', 'md', 'sm', 'xs']);
    const sides = THUMB_PRESET_NAMES.map((n) => resolveThumbPreset(n).side);
    expect(sides).toEqual([480, 400, 360, 320, 280]);
    expect(resolveThumbPreset('xl')).toEqual({ name: 'xl', side: 480, quality: 65 });
    expect(resolveThumbPreset('xs')).toEqual({ name: 'xs', side: 280, quality: 60 });
  });

  it('nome ausente ou inválido cai no padrão (md), sem lançar', () => {
    for (const bad of [undefined, null, '', 'XL', 'giant', 360, {}, 'toString', '__proto__']) {
      expect(resolveThumbPreset(bad).name).toBe('md');
    }
    expect(resolveThumbPreset().side).toBe(360);
  });

  it('isThumbPresetName só aceita as chaves dos presets', () => {
    expect(isThumbPresetName('lg')).toBe(true);
    expect(isThumbPresetName('constructor')).toBe(false);
    expect(isThumbPresetName(undefined)).toBe(false);
  });

  it('needsThumbnail usa o lado do preset passado', () => {
    expect(needsThumbnail(400, 300, 480)).toBe(false);
    expect(needsThumbnail(400, 300, 360)).toBe(true);
    expect(needsThumbnail(360, 360, 360)).toBe(false);
    expect(needsThumbnail(null, 300, 360)).toBe(false);
  });
});
