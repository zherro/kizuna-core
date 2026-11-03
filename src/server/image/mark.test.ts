import { describe, expect, it } from 'vitest';
import { resolveThumbPreset, thumbSpec } from '../../shared/image';
import { isThumbMarkMissing, thumbMark, withoutThumbMark } from './mark';

describe('marca da medida da miniatura (storage 0007)', () => {
  it('thumbSpec = <lado>q<qualidade> de cada preset', () => {
    expect(thumbSpec(resolveThumbPreset('xl'))).toBe('480q65');
    expect(thumbSpec(resolveThumbPreset('md'))).toBe('360q60');
    expect(thumbSpec(resolveThumbPreset('xs'))).toBe('280q60');
    expect(thumbSpec(resolveThumbPreset())).toBe('360q60');
  });

  it('thumbMark só marca quando há miniatura', () => {
    const md = resolveThumbPreset('md');
    const com = thumbMark(true, md);
    expect(com.thumb_spec).toBe('360q60');
    expect(Number.isNaN(Date.parse(com.thumb_at ?? ''))).toBe(false);
    expect(thumbMark(false, md)).toEqual({ thumb_spec: null, thumb_at: null });
  });

  it('isThumbMarkMissing reconhece o erro de coluna inexistente do PostgREST', () => {
    expect(
      isThumbMarkMissing({ code: 'PGRST204', message: "Could not find the 'thumb_spec' column of 'files' in the schema cache" })
    ).toBe(true);
    expect(isThumbMarkMissing({ code: '42703', message: 'column "thumb_at" of relation "files" does not exist' })).toBe(true);
    expect(isThumbMarkMissing({ message: 'duplicate key value violates unique constraint' })).toBe(false);
    expect(isThumbMarkMissing(null)).toBe(false);
    expect(isThumbMarkMissing(undefined)).toBe(false);
  });

  it('withoutThumbMark tira só as duas colunas', () => {
    const body = { id: 1, thumb_content: 'x', thumb_width: 360, thumb_spec: '360q60', thumb_at: 'agora' };
    expect(withoutThumbMark(body)).toEqual({ id: 1, thumb_content: 'x', thumb_width: 360 });
  });
});
