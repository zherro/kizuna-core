'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';

/**
 * Atalho "Editar" do detalhe, só para root. A página é ISR (HTML igual para todos), então a
 * checagem é no cliente; a barreira real continua sendo a RLS de `services` no salvar.
 */
export function RootEditLink({ href }: { href: string }) {
  const { user } = useAuth();
  if (user?.is_root !== true) return null;

  return (
    <Link
      href={href}
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
    >
      <Pencil className="h-3.5 w-3.5" /> Editar
    </Link>
  );
}
