import { thumbSpec, type ThumbPresetConfig } from '../../shared/image';

/** Colunas de `files` criadas pela migration storage/0007 (marca da medida da miniatura). */
export const THUMB_MARK_COLUMNS = ['thumb_spec', 'thumb_at'] as const;

/** Campos da marca para gravar junto da miniatura (sem miniatura → os dois nulos). */
export function thumbMark(hasThumb: boolean, preset: ThumbPresetConfig): { thumb_spec: string | null; thumb_at: string | null } {
  return hasThumb
    ? { thumb_spec: thumbSpec(preset), thumb_at: new Date().toISOString() }
    : { thumb_spec: null, thumb_at: null };
}

/** O PostgREST recusou o corpo por causa das colunas da marca? (migration 0007 ainda não aplicada) */
export function isThumbMarkMissing(errorPayload: unknown): boolean {
  let text = '';
  try {
    text = typeof errorPayload === 'string' ? errorPayload : JSON.stringify(errorPayload ?? '');
  } catch {
    return false;
  }
  return THUMB_MARK_COLUMNS.some((column) => text.includes(column));
}

/** Corpo sem as colunas da marca — para repetir a gravação em banco que ainda não tem a 0007. */
export function withoutThumbMark<T extends Record<string, unknown>>(body: T): Omit<T, 'thumb_spec' | 'thumb_at'> {
  const { thumb_spec: _spec, thumb_at: _at, ...rest } = body;
  return rest;
}
