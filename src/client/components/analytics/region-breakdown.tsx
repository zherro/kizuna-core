import type { OwnerStats } from '../../../shared/analytics';
import { BreakdownCard, ShareList } from './breakdown-card';

const TOP = 10;

/** Views do período por cidade/UF (só UF quando a cidade não é conhecida). Mostra as 10 maiores. */
export function RegionBreakdown({ items }: { items: OwnerStats['byRegion'] }) {
  const top = items.slice(0, TOP);
  const rest = items.length - top.length;
  return (
    <BreakdownCard
      title="Onde estão seus visitantes"
      hint="Cidade e estado aproximados de quem viu seus anúncios."
      empty={
        items.length === 0
          ? 'Ainda sem dados de localização neste período. Esse dado só é registrado para acessos novos.'
          : null
      }
    >
      <ShareList
        label="Visualizações por região"
        items={top.map((r) => ({ key: r.key, label: r.label, views: r.views, share: r.share }))}
      />
      {rest > 0 ? (
        <p className="px-4 pb-4 text-xs text-muted-foreground md:px-6 md:pb-6">
          E mais {rest} {rest === 1 ? 'região' : 'regiões'} com menos visualizações.
        </p>
      ) : null}
    </BreakdownCard>
  );
}
