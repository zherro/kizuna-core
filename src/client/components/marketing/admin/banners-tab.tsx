'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ImageIcon, Loader2, XCircle } from 'lucide-react';
import { AD_FORMAT_SPECS, AD_SLOT_CATALOG, isSafeImageUrl, isSafeLinkUrl, type AdFormat } from '../../../../shared/ads';
import { formatBRL } from '../../../../shared/marketing/cost';
import { useToast } from '../../../hooks/use-toast';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import { send, errMsg } from './admin-api';
import { LIMITS, loadCampaigns, loadCreatives, loadDelivery, loadReviews } from './admin-data';
import {
  committedOf,
  ctr,
  formatPct,
  moderationQueue,
  situationOf,
  spentOf,
  sumDelivery,
  validateRejection,
  type CampaignRow,
  type CreativeRow,
} from './admin-math';
import { AccountName, CARD, ErrorNote, Fact, Loading, SituationBadge, useLoader } from './admin-ui';
import { StopButton } from './stop-button';

const brDate = (iso: string) => iso.split('-').reverse().join('/');
const formatLabel = (f: string) => AD_FORMAT_SPECS[f as AdFormat]?.label ?? f;
const slotLabel = (slug: string) => AD_SLOT_CATALOG.find((s) => s.slug === slug)?.label ?? slug;

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function BannersTab() {
  const [view, setView] = useState<'queue' | 'campaigns'>('queue');
  const queue = useLoader(async () => {
    const [creatives, reviews] = await Promise.all([loadCreatives(), loadReviews()]);
    return moderationQueue(creatives, reviews);
  }, 'Não foi possível carregar a fila de banners.');

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Banners" className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1 text-sm">
        {(
          [
            ['queue', `Fila de moderação${queue.data ? ` (${queue.data.length})` : ''}`],
            ['campaigns', 'Campanhas'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${view === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === 'queue' ? <ModerationQueue queue={queue} /> : <CampaignsList />}
    </div>
  );
}

function ModerationQueue({ queue }: { queue: ReturnType<typeof useLoader<CreativeRow[]>> }) {
  const { data, error, loading, reload } = queue;
  if (loading && !data) return <Loading text="Carregando fila…" />;
  return (
    <div className="flex flex-col gap-3">
      <ErrorNote text={error} />
      {data && data.length === 0 && !error ? (
        <EmptyStateCard icon={ImageIcon} title="Fila vazia" description="Nenhum banner de anunciante aguardando revisão." />
      ) : (
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((c) => (
            <ReviewCard key={c.id} creative={c} onDone={() => void reload()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewCard({ creative: c, onDone }: { creative: CreativeRow; onDone: () => void }) {
  const { success, error } = useToast();
  const [size, setSize] = useState<string>('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  // `imageUrl`/`linkUrl` vêm do anunciante: só renderiza mídia/link com as mesmas regras do AdSlot.
  const imageOk = isSafeImageUrl(c.imageUrl);
  const linkOk = isSafeLinkUrl(c.linkUrl);

  async function approve() {
    setBusy('approve');
    try {
      await send('POST', '/api/resources/ad_creative_reviews', { creativeId: c.id, status: 'approved', reason: '' }, 'Não foi possível registrar a aprovação.');
      try {
        await send('PATCH', `/api/resources/ad_creatives_review/${c.id}`, { active: true }, 'Não foi possível ativar o banner.');
      } catch (err) {
        error(`Aprovação registrada, mas o banner não foi ativado: ${errMsg(err, 'tente aprovar de novo')}. Ele segue na fila.`);
        onDone();
        return;
      }
      success('Banner aprovado.');
      onDone();
    } catch (err) {
      error(errMsg(err, 'Não foi possível aprovar o banner.'));
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    const p = validateRejection(reason);
    if (p) return setProblem(p);
    setProblem('');
    setBusy('reject');
    try {
      await send('POST', '/api/resources/ad_creative_reviews', { creativeId: c.id, status: 'rejected', reason: reason.trim() }, 'Não foi possível reprovar o banner.');
      success('Banner reprovado.');
      onDone();
    } catch (err) {
      error(errMsg(err, 'Não foi possível reprovar o banner.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className={`${CARD} flex flex-col gap-3 p-4`}>
      <div className="overflow-hidden rounded-md bg-muted">
        {imageOk ? (
          // eslint-disable-next-line @next/next/no-img-element -- mídia de anunciante, tamanhos variados
          <img
            src={c.imageUrl}
            alt={c.alt || c.label || 'Banner enviado pelo anunciante'}
            className="mx-auto max-h-64 w-auto max-w-full object-contain"
            onLoad={(e) => setSize(`${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight} px`)}
          />
        ) : (
          <p className="p-4 text-sm text-red-700 dark:text-red-400">Endereço de imagem inválido — reprove este banner.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AccountName label={c.label || null} tenantId={c.tenantId ?? ''} />
        <Badge variant="outline">{c.kind === 'gif' ? 'GIF' : 'Imagem'}</Badge>
        <Badge variant="secondary">{formatLabel(c.format)}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Fact label="Tamanho do arquivo" value={size || '—'} />
        <Fact label="Onde aparece" value={c.slots.length ? c.slots.map(slotLabel).join(', ') : 'Todos do formato'} />
        <Fact
          label="Destino do clique"
          value={
            linkOk ? (
              <a href={c.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
                {hostOf(c.linkUrl)}
              </a>
            ) : (
              <span className="text-red-700 dark:text-red-400">link inválido</span>
            )
          }
        />
      </dl>
      {c.alt ? <p className="text-xs text-muted-foreground">Texto alternativo: {c.alt}</p> : null}

      {rejecting ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Motivo da reprovação (o anunciante vê)
            <Input aria-label="Motivo da reprovação" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: imagem com texto ilegível" />
          </label>
          {problem ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {problem}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void reject()} disabled={busy !== null} aria-label="Confirmar reprovação">
              {busy === 'reject' && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Reprovar banner
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={busy !== null}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void approve()} disabled={busy !== null || !imageOk || !linkOk} aria-label="Aprovar banner">
            {busy === 'approve' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />}
            Aprovar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={busy !== null}>
            <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" /> Reprovar
          </Button>
        </div>
      )}
    </li>
  );
}

function CampaignsList() {
  const { data, error, loading, reload } = useLoader(async () => {
    const [campaigns, delivery] = await Promise.all([loadCampaigns(), loadDelivery()]);
    return { campaigns, stats: sumDelivery(delivery), capped: campaigns.length >= LIMITS.campaigns || delivery.length >= LIMITS.metrics };
  }, 'Não foi possível carregar as campanhas.');
  const rows = useMemo(() => data?.campaigns ?? [], [data]);

  if (loading && !data) return <Loading text="Carregando campanhas…" />;
  return (
    <div className="flex flex-col gap-3">
      <ErrorNote text={error} />
      {data?.capped ? <ErrorNote text="Lista truncada: a entrega pode estar subestimada." /> : null}
      {rows.length === 0 && !error ? (
        <EmptyStateCard icon={ImageIcon} title="Nenhuma campanha de banner" description="Quando um anunciante contratar um espaço com banner, a campanha aparece aqui." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((c) => (
            <CampaignItem key={c.id} campaign={c} stats={data?.stats.get(c.id)} onChanged={() => void reload()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CampaignItem({ campaign: c, stats, onChanged }: { campaign: CampaignRow; stats?: { impressions: number; clicks: number }; onChanged: () => void }) {
  const impressions = stats?.impressions ?? 0;
  const clicks = stats?.clicks ?? 0;
  return (
    <li className={`${CARD} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        {c.imageUrl && isSafeImageUrl(c.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura de mídia de anunciante
          <img src={c.imageUrl} alt="" className="h-12 w-20 rounded bg-muted object-cover" />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{c.label || 'Banner sem rótulo'}</span>
          <span className="block text-xs text-muted-foreground">
            {slotLabel(c.slotSlug)} · {brDate(c.startsOn)} a {brDate(c.endsOn)}
            {c.stoppedOn ? ` · parada em ${brDate(c.stoppedOn)}` : ''}
          </span>
        </span>
        <SituationBadge value={situationOf(c)} />
      </div>
      <AccountName label={null} tenantId={c.tenantId} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Diária" value={formatBRL(c.dailyCents)} />
        <Fact label="Comprometido" value={formatBRL(committedOf(c))} />
        <Fact label="Gasto até hoje" value={formatBRL(spentOf(c))} />
        <Fact label="Entregas" value={impressions} />
        <Fact label="Cliques" value={clicks} />
        <Fact label="CTR" value={formatPct(ctr(clicks, impressions))} />
      </dl>
      <div>
        <StopButton resource="ad_campaigns" id={c.id} row={c} noun="campanha" onDone={onChanged} />
      </div>
    </li>
  );
}
