'use client';

import { useEffect, useState } from 'react';

/**
 * Contador de chamados abertos visíveis para quem está logado — a RLS decide o escopo (equipe:
 * todos, é o alerta de "conta recriada" para o root; usuário: os seus). Uma consulta por montagem.
 */
export function OpenTicketsBadge() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/resources/tickets?filter.status=open&pageSize=1', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { total: 0 }))
      .then((data) => active && setTotal(Number(data.total) || 0))
      .catch(() => active && setTotal(0));
    return () => {
      active = false;
    };
  }, []);

  if (total <= 0) return null;
  return (
    <span
      aria-label={`${total} chamados abertos`}
      className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
    >
      {total}
    </span>
  );
}
