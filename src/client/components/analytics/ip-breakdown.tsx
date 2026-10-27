import type { OwnerStats } from '../../../shared/analytics';
import { BreakdownCard } from './breakdown-card';

const int = (n: number) => n.toLocaleString('pt-BR');

/**
 * Ranking de acessos por IP (agrupado pela chave do IP, não pelo texto mascarado):
 * dois IPs com o mesmo mascarado aparecem em linhas separadas. Só o IP mascarado chega aqui.
 */
export function IpBreakdown({ items }: { items: OwnerStats['byIp'] }) {
  return (
    <BreakdownCard
      title="Acessos por IP"
      hint="Ajuda a notar picos de um mesmo endereço. IP parcialmente oculto: o final não é mostrado."
      empty={
        items.length === 0
          ? 'Ainda sem dados de IP neste período. Esse dado só é registrado para acessos novos.'
          : null
      }
    >
      <table className="w-full table-fixed text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-2 font-medium md:px-6">IP</th>
            <th scope="col" className="w-20 px-2 py-2 text-right font-medium md:w-28">Acessos</th>
            <th scope="col" className="w-28 px-4 py-2 text-right font-medium md:w-36 md:px-6">Visitantes-dia</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.ipKey} className="border-b border-border last:border-0">
              <td title={r.ipMasked} className="truncate px-4 py-2.5 font-medium tabular-nums md:px-6">
                {r.ipMasked || 'Não informado'}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">{int(r.views)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums md:px-6">{int(r.visitorDays)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </BreakdownCard>
  );
}
