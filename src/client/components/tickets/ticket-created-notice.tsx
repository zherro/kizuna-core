'use client';

import Link from 'next/link';
import { buttonVariants } from '../ui/button';
import { CopyButton } from './copy-button';
import { formatTicketNumber, ticketPath } from './ticket-number';
import { formatSlaDate } from './ticket-sla';

/**
 * Mostrado logo depois de abrir o chamado: número com botão de copiar e o link compartilhável do
 * detalhe no painel. O link exige login — quem abrir deslogado cai no login e volta para ele.
 * Visitante (sem sessão): o chamado fica ligado ao e-mail informado, então o acompanhamento é
 * entrando (ou criando conta) com esse e-mail.
 */
export function TicketCreatedNotice({
  ticketId,
  authenticated = true,
  email,
  slaDueAt,
}: {
  ticketId: string;
  authenticated?: boolean;
  email?: string;
  slaDueAt?: string | null;
}) {
  const number = formatTicketNumber(ticketId);
  const link = `${window.location.origin}${ticketPath(ticketId)}`;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Chamado aberto</h2>
        <p className="text-sm text-muted-foreground">
          {authenticated
            ? 'Guarde o número para acompanhar. A equipe responde pelo painel.'
            : `Guarde o número. Para acompanhar a resposta, entre ou crie uma conta com o e-mail ${email || 'informado'}.`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
        <div>
          <p className="text-xs text-muted-foreground">Número do chamado</p>
          <p className="font-mono text-lg font-semibold" data-testid="ticket-number">
            {number}
          </p>
        </div>
        <CopyButton value={number} label="Copiar número do chamado" />
      </div>

      {slaDueAt ? (
        <p className="text-sm" data-testid="ticket-sla">
          Previsão da primeira resposta: <strong>{formatSlaDate(slaDueAt)}</strong>
        </p>
      ) : null}

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Link do chamado (pede login)</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Link do chamado"
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
          <CopyButton value={link} label="Copiar link do chamado" />
        </div>
      </div>

      <Link href={ticketPath(ticketId)} className={buttonVariants()}>
        {authenticated ? 'Ver chamado' : 'Entrar para ver o chamado'}
      </Link>
    </section>
  );
}
