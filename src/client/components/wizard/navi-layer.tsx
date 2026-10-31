'use client';

import { NaviDock } from './navi-dock';
import { NaviIcon } from './navi-icon';
import type { WizardConversationView } from './use-wizard-conversation';

/**
 * A camada persistente da Naví no wizard: fica ao pé da coluna de passos e **acompanha o scroll**
 * (o shell renderiza isto uma vez, no fim do `<main>`). Dock aberto, pílula quando minimizado,
 * ou um aviso curto se a Naví caiu no meio.
 */
export function NaviLayer({ conv }: { conv: WizardConversationView }) {
  if (conv.endedMidway) {
    return (
      <p className="wz-navi-dock mx-auto mt-6 w-full max-w-2xl rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        A Naví saiu do ar. Pode continuar preenchendo na mão — o que ela já respondeu está salvo.
      </p>
    );
  }

  if (conv.minimized) {
    return (
      <button
        type="button"
        onClick={() => conv.setMinimized(false)}
        className="wz-navi-fab"
        aria-label="Abrir a Naví"
        data-testid="navi-fab"
        data-busy={conv.pending || undefined}
      >
        <NaviIcon className="h-4 w-4" /> Naví
        {conv.pending ? <span className="wz-navi-fab-dot" aria-hidden /> : null}
      </button>
    );
  }

  return (
    <div className="mt-6">
      <NaviDock conv={conv} />
    </div>
  );
}
