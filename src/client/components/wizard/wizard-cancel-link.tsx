'use client';

import { cn } from '../../../lib/utils';

/**
 * "Cancelar" do rodapé do wizard: link de texto na cor do tema (sem fundo, sem borda), com foco
 * visível. É um `<button>` porque dispara a mesma saída (com confirmação) do antigo cabeçalho.
 */
export function WizardCancelLink({
  onClick,
  disabled,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-wz-cancel
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-sm px-1 py-2 text-sm font-medium text-primary underline-offset-4 transition-colors',
        'hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      Cancelar
    </button>
  );
}
