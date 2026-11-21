import { ChevronDown } from 'lucide-react';
import type { EventTicket } from './evento-helpers';
import { groupTickets, splitTicketGroups, TICKET_ROWS_VISIBLE, type TicketGroup, type TicketRow } from './ticket-groups';

const CARD_CLASS =
  'rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]';

/** Lote, lotação e observação de compra, discretos sob o nome da linha. */
function RowMeta({ row, extra }: { row: TicketRow; extra?: string | null }) {
  const parts = [extra, row.people, row.lote].filter((p): p is string => !!p);
  if (parts.length === 0 && !row.comprar) return null;
  return (
    <>
      {parts.length > 0 && (
        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {parts.map((p, i) => (
            <span key={i}>{p}</span>
          ))}
        </span>
      )}
      {row.comprar && <span className="mt-0.5 block text-xs text-muted-foreground">{row.comprar}</span>}
    </>
  );
}

function Price({ value }: { value: string | null }) {
  return value ? <span className="shrink-0 text-sm font-bold tabular-nums">{value}</span> : null;
}

/** Um setor: com várias linhas, nome do setor em cima e as modalidades embaixo; com uma, linha única. */
function GroupItem({ group }: { group: TicketGroup }) {
  if (group.rows.length === 1) {
    const row = group.rows[0];
    const title = group.sector ?? row.label ?? 'Ingresso';
    // Com setor, o `label` (Inteira, "10 copos"…) desce para a linha de detalhe.
    const extra = group.sector ? row.label : null;
    return (
      <li className="flex items-baseline justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{title}</h3>
          <RowMeta row={row} extra={extra} />
        </div>
        <Price value={row.price} />
      </li>
    );
  }
  return (
    <li className="px-4 py-3">
      <h3 className="text-sm font-semibold leading-snug">{group.sector}</h3>
      <ul className="mt-1">
        {group.rows.map((row, i) => (
          <li key={i} className="flex items-baseline justify-between gap-4 py-1">
            <span className="min-w-0 text-sm text-muted-foreground">
              <span className="text-foreground/90">{row.label ?? 'Ingresso'}</span>
              <RowMeta row={row} />
            </span>
            <Price value={row.price} />
          </li>
        ))}
      </ul>
    </li>
  );
}

function GroupList({ groups }: { groups: TicketGroup[] }) {
  return (
    <ul className="divide-y divide-border">
      {groups.map((g, i) => (
        <GroupItem key={`${g.sector ?? g.rows[0]?.label ?? ''}-${i}`} group={g} />
      ))}
    </ul>
  );
}

/**
 * Ingressos do evento agrupados por setor numa lista compacta (um card só, setores separados por
 * linha), do mais barato ao mais caro. Passando de `limit` linhas, o resto fica num "Ver mais" nativo
 * (`<details>`): sem JS, sem estado.
 */
export function TicketGroupList({ tickets, limit = TICKET_ROWS_VISIBLE }: { tickets: EventTicket[]; limit?: number }) {
  const { visible, hidden, hiddenCount } = splitTicketGroups(groupTickets(tickets), limit);
  return (
    <div className={`overflow-hidden ${CARD_CLASS}`}>
      <GroupList groups={visible} />
      {hidden.length > 0 && (
        <details className="group border-t border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-brand hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Ver mais {hiddenCount} ingressos</span>
            <span className="hidden group-open:inline">Mostrar menos</span>
            <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border">
            <GroupList groups={hidden} />
          </div>
        </details>
      )}
    </div>
  );
}
