'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Projeta a "chrome" do wizard (rótulo do modo, toggle de layout, ações de IA, Cancelar) no
 * cabeçalho ÚNICO do `PanelShellBase` (o `<div id="wz-header-slot">` do ramo full-bleed), pra não
 * existir um segundo cabeçalho. Sem o slot no DOM (SSR, outro host), renderiza inline como fallback.
 * Só do `md` pra cima: no mobile o `<Wizard>` manda a chrome para o cabeçalho do formulário.
 */
export function WizardHeaderPortal({
  children,
  compact = false,
}: {
  children: ReactNode;
  /** Fallback inline sem tarja (sem borda, altura mínima) — usado pelo cabeçalho compacto. */
  compact?: boolean;
}) {
  const [el, setEl] = useState<Element | null>(null);
  useEffect(() => {
    setEl(document.getElementById('wz-header-slot'));
  }, []);
  if (!el) {
    return (
      <div
        className={
          compact
            ? 'flex shrink-0 items-center justify-end gap-2 px-4 pt-1 sm:px-6'
            : 'flex items-center justify-end gap-2 border-b border-border px-4 py-2 sm:px-6'
        }
      >
        {children}
      </div>
    );
  }
  return createPortal(children, el);
}
