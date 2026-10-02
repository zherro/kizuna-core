'use client';

import { Button } from '../../ui/button';

type Props = {
  dirty: boolean;
  saving: boolean;
  /** Tentou salvar e ainda há campo inválido. */
  invalid: boolean;
  onDiscard: () => void;
};

/** Barra fixa no rodapé: só aparece com alteração pendente (ou erro de validação). */
export function SaveBar({ dirty, saving, invalid, onDiscard }: Props) {
  if (!dirty && !invalid) return null;

  return (
    <div className="sticky bottom-4 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3 rounded-[var(--ui-radius-card-lg,1.5rem)] border border-border/60 bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <p className={invalid ? 'flex-1 text-sm text-destructive' : 'flex-1 text-sm text-muted-foreground'}>
          {invalid ? 'Revise os campos destacados.' : 'Alterações não salvas'}
        </p>
        {dirty ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            Descartar
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
