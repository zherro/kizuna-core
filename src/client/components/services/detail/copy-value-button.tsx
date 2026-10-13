'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Botão compacto "copiar" para um valor de contato (telefone, WhatsApp, e-mail, site). Só ícone,
 * com alvo de toque de 36px; confirma por 2 s e anuncia o resultado para leitores de tela.
 */
export function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      title={copied ? 'Copiado' : 'Copiar'}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only" role="status">
        {copied ? 'Copiado' : ''}
      </span>
    </button>
  );
}
