/**
 * Agrupamento dos ingressos do evento por setor (Pista, Camarote, Mesa Ouro…), para a página mostrar
 * faixas compactas em vez de um card por ingresso. Puro, sem React: testável isolado.
 *
 * O setor vem do campo `setor`; sem ele, do prefixo do `titulo` antes de um separador explícito
 * ("PISTA — Inteira" → "PISTA"). Sem setor nem separador, o ingresso fica sozinho (lista compacta):
 * nada é deduzido de palavras soltas ("Mesa Ouro" e "Mesa Prata" continuam setores distintos).
 */
import { formatBRL, ticketDisplay, type EventTicket } from './evento-helpers';

export type TicketRow = {
  /** O que diferencia a linha dentro do setor (Inteira, Meia, "10 copos + whisky"…); null = só o setor. */
  label: string | null;
  /** Lote ("1º lote") e lotação ("6 pessoas"), quando não estão no `label`. */
  lote: string | null;
  people: string | null;
  /** Preço formatado ("R$ 100,00" / "Gratuito"); null = sem valor informado. */
  price: string | null;
  valor: number | null;
  /** Observação de compra do ingresso (texto livre). */
  comprar: string | null;
};

export type TicketGroup = {
  /** Nome do setor como veio no dado; null = ingresso sem setor (a linha leva o próprio nome). */
  sector: string | null;
  rows: TicketRow[];
  /** Menor valor do grupo (null = nenhum com valor). */
  min: number | null;
};

/** Quantas linhas aparecem antes do "ver mais". */
export const TICKET_ROWS_VISIBLE = 6;

const SEPARATOR = /\s+[—–-]\s+|\s*:\s+/;

/** Setor do ingresso: `setor`, senão o prefixo do título antes de " — ", " – ", " - " ou ": ". */
export function ticketSector(t: EventTicket): string | null {
  if (t.setor) return t.setor;
  if (!t.titulo) return null;
  const m = t.titulo.match(SEPARATOR);
  if (!m || m.index == null) return null;
  const head = t.titulo.slice(0, m.index).trim();
  const tail = t.titulo.slice(m.index + m[0].length).trim();
  return head && tail ? head : null;
}

const key = (s: string) => s.trim().toLocaleLowerCase('pt-BR');

/** Menor primeiro; sem valor por último; empate mantém a ordem de entrada. */
function byValue<T>(items: T[], value: (x: T) => number | null): T[] {
  return items
    .map((x, i) => ({ x, i, v: value(x) }))
    .sort((a, b) => (a.v ?? Infinity) - (b.v ?? Infinity) || a.i - b.i)
    .map(({ x }) => x);
}

function toRow(t: EventTicket, sector: string | null): TicketRow {
  // Com setor deduzido do título, o ticketDisplay já sabe tirar o prefixo do resto.
  const d = ticketDisplay(sector ? { ...t, setor: sector } : t);
  return {
    label: sector ? d.detail : d.name,
    lote: d.lote,
    people: d.people,
    price: t.valor == null ? null : t.valor > 0 ? formatBRL(t.valor) : 'Gratuito',
    valor: t.valor,
    comprar: t.comprar,
  };
}

/**
 * Ingressos → grupos por setor (mesmo setor ignorando maiúsculas; o nome exibido é o da 1ª
 * ocorrência). Linhas do mais barato ao mais caro; grupos pelo menor preço de cada um.
 */
export function groupTickets(tickets: EventTicket[]): TicketGroup[] {
  const groups: { sector: string | null; tickets: EventTicket[] }[] = [];
  const index = new Map<string, number>();
  for (const t of tickets) {
    const sector = ticketSector(t);
    if (!sector) {
      groups.push({ sector: null, tickets: [t] });
      continue;
    }
    const k = key(sector);
    const at = index.get(k);
    if (at == null) {
      index.set(k, groups.length);
      groups.push({ sector, tickets: [t] });
    } else {
      groups[at].tickets.push(t);
    }
  }
  const built = groups.map((g): TicketGroup => {
    const rows = byValue(
      g.tickets.map((t) => toRow(t, g.sector)),
      (r) => r.valor
    );
    const values = rows.map((r) => r.valor).filter((v): v is number => v != null);
    return { sector: g.sector, rows, min: values.length ? Math.min(...values) : null };
  });
  return byValue(built, (g) => g.min);
}

/**
 * Corta os grupos para o "ver mais" sem partir um setor ao meio: entram grupos inteiros enquanto
 * couberem em `limit` linhas (o 1º grupo entra sempre).
 */
export function splitTicketGroups(
  groups: TicketGroup[],
  limit: number = TICKET_ROWS_VISIBLE
): { visible: TicketGroup[]; hidden: TicketGroup[]; hiddenCount: number } {
  let rows = 0;
  let cut = 0;
  for (const g of groups) {
    if (cut > 0 && rows + g.rows.length > limit) break;
    rows += g.rows.length;
    cut += 1;
  }
  const hidden = groups.slice(cut);
  const hiddenRows = hidden.reduce((n, g) => n + g.rows.length, 0);
  // Esconder uma linha só não poupa espaço: o botão ocupa o mesmo que ela.
  if (hiddenRows < 2) return { visible: groups, hidden: [], hiddenCount: 0 };
  return { visible: groups.slice(0, cut), hidden, hiddenCount: hiddenRows };
}
