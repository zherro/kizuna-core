'use client';

import { ChevronDown, Maximize2, RefreshCw } from 'lucide-react';
import { NaviIcon } from './navi-icon';
import { NaviComposer } from './navi-composer';
import type { WizardConversationView } from './use-wizard-conversation';

/**
 * Dock da Naví: última fala em destaque + a penúltima desfocada + `NaviComposer`. Fica ao pé da
 * coluna de passos e acompanha o scroll (`.wz-navi-dock` = `sticky bottom`). Minimizar recolhe
 * pra pílula (ver `NaviLayer`); "Ver conversa" abre o `NaviPanel`. Renderer puro — o estado vem
 * de `conv` (`useWizardConversation`).
 */
export function NaviDock({ conv }: { conv: WizardConversationView }) {
  const last = conv.turns[conv.turns.length - 1];
  const penult = conv.turns.length >= 2 ? conv.turns[conv.turns.length - 2] : null;

  return (
    <div className="wz-navi-dock mx-auto w-full max-w-2xl" data-testid="navi-dock">
      {penult ? (
        <p className="px-4 pb-1 text-xs text-muted-foreground blur-[1.6px] select-none">
          {penult.content}
        </p>
      ) : null}

      <div className="wz-navi-card p-3.5">
        <div className="flex gap-2.5">
          <span className="wz-navi-badge">
            <NaviIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium leading-relaxed text-foreground">
              {conv.pending ? 'pensando…' : (last?.content ?? conv.greeting)}
            </p>

            {conv.status === 'degraded' ? (
              <button
                type="button"
                onClick={() => conv.retry?.()}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
              </button>
            ) : (
              <div className="mt-3">
                <NaviComposer conv={conv} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => conv.setMinimized(true)}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ChevronDown className="h-3 w-3" /> minimizar
          </button>
          <button
            type="button"
            onClick={() => conv.setPanelOpen(true)}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Maximize2 className="h-3 w-3" /> Ver conversa
          </button>
        </div>
      </div>
    </div>
  );
}
