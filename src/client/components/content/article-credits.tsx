import type { ReactNode } from 'react';

/** Crédito em texto miúdo. `text` (texto puro) ou `children` (com links, ex. "Foto: Autor / Licença"). */
export function ArticleCredits({ text, children }: { text?: string; children?: ReactNode }) {
  if (children != null && children !== false) {
    return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
  }
  if (!text || text.trim() === '') return null;
  return <p className="text-xs leading-5 text-muted-foreground">{text}</p>;
}
