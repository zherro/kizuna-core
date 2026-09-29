import { describe, expect, it } from 'vitest';
import { DISPLAY_FONTS, isDisplayFont } from './display-fonts';

describe('isDisplayFont', () => {
  it('aceita as fontes da lista curada', () => {
    for (const f of DISPLAY_FONTS) expect(isDisplayFont(f)).toBe(true);
  });
  it('recusa fonte fora da lista e não-string', () => {
    expect(isDisplayFont('comic-sans')).toBe(false);
    expect(isDisplayFont(undefined)).toBe(false);
    expect(isDisplayFont(3)).toBe(false);
  });
});
