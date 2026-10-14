/**
 * URL da capa de um item do swipe/curtidos. Módulo sem dependências (nem React, nem ícones) para
 * blocos leves, como o `PainelWelcome`, importarem sem puxar o `SwipeCard`. O `swipe-card` o reexporta.
 */

/** Capa do item. O card do swipe ocupa quase a tela: imagem grande; listas pequenas usam `'thumb'`. */
export function coverUrl(fileId: string | null, size: 'full' | 'thumb' = 'full'): string | null {
  if (!fileId) return null;
  const base = `/api/public/storage/files/${fileId}/content`;
  return size === 'thumb' ? `${base}?size=thumb` : base;
}
