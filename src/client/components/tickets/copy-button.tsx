'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../ui/button';

/** Copia `value` para a área de transferência e confirma por 2 s ("Copiado"). */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={copy} aria-label={label}>
      {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  );
}
