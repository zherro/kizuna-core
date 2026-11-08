'use client';
import { useMemo, useState } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { AD_FORMAT_SPECS, AD_SLOT_CATALOG, type AdFormat } from '../../../../shared/ads';
import { costCents, formatBRL, situation } from '../../../../shared/marketing/cost';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import {
  checkBannerImage,
  contractableSlots,
  creativeKind,
  readImageSize,
  recommendedSize,
  uploadBanner,
  validateBannerFile,
  validateBannerLink,
} from './banner-rules';
import { createItem, fetchPage } from './data';
import { spentSoFar } from './metrics-math';
import { PeriodFields, StopButton } from './period-fields';
import { defaultDraft, evaluatePeriod, type PeriodDraft } from './period-form';
import type { Balance, CampaignRow, MyCreative } from './types';
import { useLoad } from './use-load';
import { Field, formatDay, LoadError, Loading, Notice, Pager, SectionTitle, selectClass, SituationBadge } from './ui';

const slotLabel = (slug: string) => AD_SLOT_CATALOG.find((s) => s.slug === slug)?.label ?? slug;

type Picked = { file: File; preview: string; width: number; height: number };

function NewBanner({ tenantId, balance, onCreated }: { tenantId: string; balance: Balance; onCreated: () => void }) {
  const slots = useLoad(async () => {
    const r = await fetchPage<{ slug: string; enabled: boolean; media: string[] }>('ad_slots', { pageSize: 100 });
    return contractableSlots(r.items);
  });
  const [slot, setSlot] = useState('');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [label, setLabel] = useState('');
  const [draft, setDraft] = useState<PeriodDraft>(() => defaultDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const format: AdFormat | null = AD_SLOT_CATALOG.find((s) => s.slug === slot)?.format ?? null;
  const evaluation = useMemo(() => evaluatePeriod(draft, balance.balanceCents), [draft, balance.balanceCents]);
  const linkCheck = linkUrl ? validateBannerLink(linkUrl) : null;
  const imageCheck = picked && format ? checkBannerImage(format, picked) : null;
  const ready = !!slot && !!picked && imageCheck?.ok === true && validateBannerLink(linkUrl).ok && alt.trim().length > 0 && evaluation.check.ok && !busy;

  async function onFile(file: File | undefined) {
    setPicked(null);
    setFileError(null);
    if (!file) return;
    const ok = validateBannerFile(file);
    if (!ok.ok) return setFileError(ok.reason);
    try {
      const size = await readImageSize(file);
      setPicked({ file, preview: URL.createObjectURL(file), ...size });
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Imagem inválida.');
    }
  }

  async function submit() {
    if (!picked || !format) return;
    setBusy(true);
    setError(null);
    setDone(false);
    let creativeId: string | null = null;
    try {
      const imageUrl = await uploadBanner(picked.file);
      creativeId = crypto.randomUUID();
      await createItem('ad_creatives_mine', {
        id: creativeId,
        tenantId,
        format,
        kind: creativeKind(picked.file.type),
        imageUrl,
        alt: alt.trim(),
        linkUrl: linkUrl.trim(),
        label: label.trim(),
        slots: [slot],
      });
      await createItem('ad_campaigns', {
        creativeId,
        slotSlug: slot,
        dailyCents: evaluation.dailyCents,
        startsOn: draft.startsOn,
        endsOn: draft.endsOn,
      });
      setDone(true);
      setPicked(null);
      setAlt('');
      setLabel('');
      setLinkUrl('');
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível enviar o banner.';
      setError(creativeId ? `O banner foi enviado, mas a campanha não foi criada. ${msg}` : msg);
      if (creativeId) onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--ui-radius-card,1rem)] border bg-card p-4" aria-labelledby="new-banner">
      <h2 id="new-banner" className="text-base font-semibold">
        Divulgar um banner
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha o espaço, envie a imagem ou GIF e defina o período. O banner só vai ao ar depois de aprovado pela equipe; o valor fica reservado no saldo e volta se você parar antes.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {slots.loading && !slots.data ? <Loading /> : null}
        {slots.error ? <LoadError message={slots.error} onRetry={slots.reload} /> : null}
        {slots.data && slots.data.length === 0 ? <Notice tone="warn">Nenhum espaço de banner está aberto para contratação agora.</Notice> : null}
        {slots.data && slots.data.length > 0 ? (
          <>
            <Field label="Espaço" hint={format ? `${AD_FORMAT_SPECS[format].label} — tamanho recomendado ${recommendedSize(format)}. GIF aceito.` : 'Cada espaço tem um formato próprio.'}>
              <select className={selectClass} value={slot} onChange={(e) => { setSlot(e.target.value); setPicked(null); setFileError(null); }}>
                <option value="">Escolha um espaço</option>
                {slots.data.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Imagem ou GIF" hint="PNG, JPG, WebP ou GIF, até 5 MB. A proporção precisa seguir o formato do espaço.">
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={!slot} onChange={(e) => void onFile(e.target.files?.[0])} className="h-auto py-2" />
            </Field>
            {fileError ? <Notice tone="error">{fileError}</Notice> : null}
            {picked ? (
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
                <img src={picked.preview} alt="Prévia do banner" className="max-h-48 w-full rounded-lg border bg-muted object-contain" />
                <p className="text-xs text-muted-foreground">
                  {picked.width}×{picked.height}px · {(picked.file.size / 1024).toFixed(0)} KB
                </p>
                {imageCheck && !imageCheck.ok ? <Notice tone="warn">{imageCheck.reason}</Notice> : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Link de destino" hint="Para onde o clique leva (abre em outra aba).">
                <Input type="url" inputMode="url" placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} aria-invalid={linkCheck ? !linkCheck.ok : undefined} />
              </Field>
              <Field label="Texto alternativo" hint="Descreva a imagem para leitores de tela.">
                <Input value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
              </Field>
              <Field label="Nome interno (opcional)" hint="Só você e a equipe veem.">
                <Input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
              </Field>
            </div>
            {linkCheck && !linkCheck.ok ? <Notice tone="warn">{linkCheck.reason}</Notice> : null}
            <PeriodFields draft={draft} onChange={setDraft} evaluation={evaluation} balanceCents={balance.balanceCents} />
            {error ? <Notice tone="error">{error}</Notice> : null}
            {done ? <Notice tone="ok">Banner enviado para análise. Você acompanha a aprovação na lista abaixo.</Notice> : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={submit} disabled={!ready}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Enviar por {formatBRL(evaluation.totalCents)}
              </Button>
              <span className="text-xs text-muted-foreground">Para outro espaço, envie outro banner.</span>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

const REVIEW_LABEL: Record<string, string> = { pending: 'Em análise', approved: 'Aprovado', rejected: 'Reprovado' };

function ReviewBadge({ status }: { status: string }) {
  const cls =
    status === 'approved'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
      : status === 'rejected'
        ? 'border-destructive/40 bg-destructive/10 text-destructive'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300';
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{REVIEW_LABEL[status] ?? status}</span>;
}

function CampaignList({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const campaigns = useLoad(() => fetchPage<CampaignRow>('ad_campaigns', { page, pageSize: 6 }), [page, refreshKey]);
  const creatives = useLoad(() => fetchPage<MyCreative>('my_ad_creatives', { pageSize: 200 }), [refreshKey]);
  const byId = useMemo(() => new Map((creatives.data?.items ?? []).map((c) => [c.id, c])), [creatives.data]);
  const orphans = (creatives.data?.items ?? []).filter((c) => !(campaigns.data?.items ?? []).some((k) => k.creativeId === c.id));

  return (
    <section>
      <SectionTitle>Meus banners</SectionTitle>
      {(campaigns.loading && !campaigns.data) || (creatives.loading && !creatives.data) ? <Loading /> : null}
      {campaigns.error ? <LoadError message={campaigns.error} onRetry={campaigns.reload} /> : null}
      {creatives.error ? <LoadError message={creatives.error} onRetry={creatives.reload} /> : null}
      {campaigns.data && campaigns.data.items.length === 0 && orphans.length === 0 ? (
        <EmptyStateCard icon={ImageIcon} title="Nenhum banner ainda" description="Envie o primeiro acima. Ele passa por análise antes de aparecer no site." />
      ) : null}
      {campaigns.data && campaigns.data.items.length > 0 ? (
        <>
          <ul className="flex flex-col gap-3">
            {campaigns.data.items.map((k) => {
              const c = byId.get(k.creativeId);
              const period = { startsOn: k.startsOn, endsOn: k.endsOn, stoppedOn: k.stoppedOn };
              const sit = situation(period);
              const approved = c?.reviewStatus === 'approved';
              return (
                <li key={k.id} className="rounded-[var(--ui-radius-card,1rem)] border bg-card p-4">
                  <div className="flex gap-3">
                    {c ? (
                      // eslint-disable-next-line @next/next/no-img-element -- criativo do próprio anunciante
                      <img src={c.imageUrl} alt={c.alt} className="h-16 w-24 shrink-0 rounded-md border bg-muted object-cover" />
                    ) : (
                      <div className="h-16 w-24 shrink-0 rounded-md border bg-muted" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-medium">{c?.label || slotLabel(k.slotSlug)}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <ReviewBadge status={c?.reviewStatus ?? 'pending'} />
                          <SituationBadge situation={sit} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{slotLabel(k.slotSlug)}</p>
                    </div>
                  </div>
                  {c?.reviewStatus === 'rejected' ? (
                    <div className="mt-3">
                      <Notice tone="error">Reprovado{c.reviewReason ? `: ${c.reviewReason}` : '.'} O valor reservado volta ao saldo se você parar a campanha.</Notice>
                    </div>
                  ) : null}
                  {!approved && c?.reviewStatus !== 'rejected' ? (
                    <p className="mt-3 text-xs text-muted-foreground">Aguardando aprovação da equipe. Os dias passam mesmo antes da aprovação; se quiser, pare e envie outro.</p>
                  ) : null}
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Período</dt>
                      <dd>
                        {formatDay(k.startsOn)} a {formatDay(k.endsOn)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Diária</dt>
                      <dd className="tabular-nums">{formatBRL(k.dailyCents)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Gasto até hoje</dt>
                      <dd className="tabular-nums">{formatBRL(spentSoFar(k.dailyCents, period))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Reservado no total</dt>
                      <dd className="tabular-nums">{formatBRL(costCents(k.dailyCents, period))}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <StopButton resource="ad_campaigns" id={k.id} dailyCents={k.dailyCents} period={period} onStopped={onChanged} />
                  </div>
                </li>
              );
            })}
          </ul>
          <Pager page={campaigns.data.page} totalPages={campaigns.data.totalPages} onPage={setPage} />
        </>
      ) : null}
      {orphans.length > 0 ? (
        <div className="mt-4">
          <Notice tone="info">
            {orphans.length} banner(s) enviado(s) sem campanha ({orphans.map((o) => o.label || slotLabel(o.slots[0] ?? '')).join(', ')}). Sem campanha eles não vão ao ar nem cobram nada.
          </Notice>
        </div>
      ) : null}
    </section>
  );
}

export function BannersTab({ tenantId, balance, reloadBalance }: { tenantId: string; balance: Balance; reloadBalance: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const changed = () => {
    setRefreshKey((k) => k + 1);
    reloadBalance();
  };
  return (
    <div className="flex flex-col gap-6">
      <NewBanner tenantId={tenantId} balance={balance} onCreated={changed} />
      <CampaignList refreshKey={refreshKey} onChanged={changed} />
    </div>
  );
}
