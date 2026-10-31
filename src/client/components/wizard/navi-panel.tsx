'use client';

import { X } from 'lucide-react';
import { NaviIcon } from './navi-icon';
import { NaviComposer } from './navi-composer';
import type { WizardConversationView } from './use-wizard-conversation';

/**
 * Fio completo da Naví. Desktop (`md+`): painel ancorado à direita. Mobile: tela cheia.
 * Mesmo estado do `NaviDock` (`conv`) + o mesmo `NaviComposer`. Saudação só quando o fio ainda
 * não começou (`conv.fresh`).
 */
export function NaviPanel({ conv }: { conv: WizardConversationView }) {
  if (!conv.panelOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/30 md:bg-transparent"
      onMouseDown={(e) => e.target === e.currentTarget && conv.setPanelOpen(false)}
    >
      <aside
        role="dialog"
        aria-label="Conversa com a Naví"
        className="flex h-full w-full flex-col bg-background shadow-xl md:w-[420px] md:border-l md:border-border"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <span className="wz-navi-badge">
            <NaviIcon className="h-4 w-4" />
          </span>
          <span className="flex-1 text-sm font-semibold">Naví</span>
          <button type="button" onClick={() => conv.setPanelOpen(false)} aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
          {conv.fresh ? (
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
              {conv.greeting}
            </div>
          ) : null}
          {conv.turns.map((t, i) => (
            <div
              key={i}
              className={
                t.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground'
                  : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2'
              }
            >
              {t.content}
            </div>
          ))}
          {conv.pending ? (
            <div className="mr-auto rounded-2xl bg-muted px-3 py-2 text-muted-foreground">
              pensando…
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <NaviComposer conv={conv} />
        </div>
      </aside>
    </div>
  );
}
