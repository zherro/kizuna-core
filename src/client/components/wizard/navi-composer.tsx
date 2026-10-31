'use client';

import { useState } from 'react';
import { Check, Send } from 'lucide-react';
import type { WizardConversationChoice } from './conversation-types';
import type { WizardConversationView } from './use-wizard-conversation';

/**
 * Tags/opções + campo livre + validação. Compartilhado pelo `NaviDock` (inline) e pelo
 * `NaviPanel` (lateral/tela cheia) — a conversa é a mesma nos dois.
 */
export function NaviComposer({ conv }: { conv: WizardConversationView }) {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');

  const hasChoices = conv.choices.length > 0;

  const toggleMulti = (label: string) => {
    setError('');
    setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));
  };

  const pick = (c: WizardConversationChoice) => {
    setError('');
    conv.pickChoice(c);
  };

  const sendSelected = () => {
    if (selected.length === 0) return;
    const joined = selected.join(', ');
    setSelected([]);
    setError('');
    void conv.send(joined);
  };

  const submitInput = () => {
    const t = input.trim();
    if (!t) {
      if (selected.length > 0) return sendSelected();
      setError(hasChoices ? 'Escreva uma mensagem ou toque numa opção.' : 'Escreva uma mensagem.');
      return;
    }
    setError('');
    setInput('');
    void conv.send(t);
  };

  return (
    <div className="space-y-3">
      {hasChoices ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Sugestões da Naví</p>
          <div className="flex flex-wrap items-center gap-2">
            {conv.choices.map((c) => {
              const isMulti = Boolean(c.multi);
              const on = selected.includes(c.label);
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => (isMulti ? toggleMulti(c.label) : pick(c))}
                  data-on={on || undefined}
                  data-advance={c.advance || undefined}
                  className="wz-navi-chip"
                >
                  {isMulti ? (
                    <span className="wz-navi-checkbox">
                      {on ? <Check className="h-3 w-3" /> : null}
                    </span>
                  ) : null}
                  {c.label}
                </button>
              );
            })}
            {selected.length > 0 ? (
              <button type="button" onClick={sendSelected} className="wz-navi-send">
                Enviar {selected.length}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && submitInput()}
          placeholder={hasChoices ? 'ou escreva aqui…' : 'escreva aqui…'}
          disabled={conv.pending}
          aria-invalid={Boolean(error) || undefined}
          className="h-10 flex-1 rounded-full bg-muted px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={submitInput}
          disabled={conv.pending}
          aria-label="Enviar mensagem"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <p role="alert" className="wz-navi-error text-xs font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}
