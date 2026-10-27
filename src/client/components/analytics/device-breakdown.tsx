import type { OwnerStats } from '../../../shared/analytics';
import { DEVICE_LABELS } from '../../../shared/analytics/metrics';
import { BreakdownCard, ShareList } from './breakdown-card';

/** Views do período por aparelho (celular, tablet, computador). */
export function DeviceBreakdown({ items }: { items: OwnerStats['byDevice'] }) {
  return (
    <BreakdownCard
      title="Dispositivos"
      hint="Em que tipo de aparelho seus anúncios foram vistos."
      empty={
        items.length === 0
          ? 'Ainda sem dados de aparelho neste período. Esse dado só é registrado para acessos novos.'
          : null
      }
    >
      <ShareList
        label="Visualizações por dispositivo"
        items={items.map((d) => ({
          key: d.device,
          label: DEVICE_LABELS[d.device] ?? d.device,
          views: d.views,
          share: d.share,
        }))}
      />
    </BreakdownCard>
  );
}
