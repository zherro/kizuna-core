import type { OwnerStats } from '../../../shared/analytics';
import { CHANNEL_LABELS } from '../../../shared/analytics/metrics';
import { BreakdownCard, ShareList } from './breakdown-card';

/** Cliques no contato do período por canal (WhatsApp, telefone, ingresso...). */
export function ChannelBreakdown({ items }: { items: OwnerStats['byChannel'] }) {
  return (
    <BreakdownCard
      title="Cliques por canal"
      hint="Por onde as pessoas tentaram falar com você. Conta o primeiro clique de cada visitante por dia e anúncio."
      empty={items.length === 0 ? 'Nenhum clique no contato neste período.' : null}
    >
      <ShareList
        label="Cliques no contato por canal"
        unit={['clique', 'cliques']}
        items={items.map((c) => ({
          key: c.channel,
          label: CHANNEL_LABELS[c.channel] ?? c.channel,
          views: c.contacts,
          share: c.share,
        }))}
      />
    </BreakdownCard>
  );
}
