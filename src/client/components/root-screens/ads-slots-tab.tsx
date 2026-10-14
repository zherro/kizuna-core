'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  AD_FORMAT_SPECS,
  AD_SLOT_CATALOG,
  summarize,
  summarizeOwn,
  type AdMedia,
  type AdSlotConfig,
  type AdStatRow,
} from '../../../shared/ads';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { fetchAdStats, formatCtr, rangeFrom } from './ads-metrics-tab';

const MEDIA_OPTIONS: Array<{ value: AdMedia; label: string }> = [
  { value: 'imagem', label: 'Imagem' },
  { value: 'gif', label: 'GIF' },
  { value: 'google', label: 'Google' },
];

const DEFAULTS: Omit<AdSlotConfig, 'slug'> = {
  enabled: false,
  media: ['imagem', 'gif'],
  googleWeight: 0,
  googleAdUnit: null,
  rotateSeconds: 0,
};

function validate(c: AdSlotConfig): string {
  if (!Number.isFinite(c.googleWeight) || c.googleWeight < 0 || c.googleWeight > 1000) {
    return 'Peso do Google deve ficar entre 0 e 1000.';
  }
  const r = c.rotateSeconds;
  if (!Number.isInteger(r) || (r !== 0 && (r < 5 || r > 600))) {
    return 'Rotação deve ser 0 (desligada) ou de 5 a 600 segundos.';
  }
  return '';
}

function SlotCard({
  def,
  initial,
  stats,
}: {
  def: (typeof AD_SLOT_CATALOG)[number];
  initial: AdSlotConfig;
  stats: AdStatRow[] | null;
}) {
  const [cfg, setCfg] = useState<AdSlotConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const spec = AD_FORMAT_SPECS[def.format];
  const totals = stats ? summarize(stats, { slot: def.slug }) : null;
  const ownCtr = stats ? summarizeOwn(stats, { slot: def.slug }).ctr : null;
  const googleOn = cfg.media.includes('google');
  const noUnit = googleOn && !(cfg.googleAdUnit ?? '').trim();
  const slug = def.slug;

  function toggleMedia(media: AdMedia, on: boolean) {
    setCfg((c) => ({
      ...c,
      media: on ? Array.from(new Set([...c.media, media])) : c.media.filter((m) => m !== media),
    }));
  }

  async function save() {
    const problem = validate(cfg);
    if (problem) {
      setMessage({ ok: false, text: problem });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/resources/ad_slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, googleAdUnit: (cfg.googleAdUnit ?? '').trim() || null }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(body?.message ?? 'Não foi possível salvar o slot.');
      setMessage({ ok: true, text: 'Slot salvo.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Não foi possível salvar o slot.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{def.label}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {slug} · {spec.label} · altura mín. {spec.minHeight}px
          </p>
        </div>
        <Switch
          aria-label={`Habilitado ${slug}`}
          checked={cfg.enabled}
          onCheckedChange={(enabled) => setCfg((c) => ({ ...c, enabled }))}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        {MEDIA_OPTIONS.map((m) => (
          <label key={m.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              aria-label={`${slug} ${m.label}`}
              checked={cfg.media.includes(m.value)}
              onCheckedChange={(on) => toggleMedia(m.value, on)}
            />
            {m.label}
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Peso do Google (0–1000)
          <Input
            type="number"
            min={0}
            max={1000}
            aria-label={`Peso Google ${slug}`}
            value={cfg.googleWeight}
            onChange={(e) => setCfg((c) => ({ ...c, googleWeight: Number(e.target.value) }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
          Ad unit (Google)
          <Input
            aria-label={`Ad unit ${slug}`}
            value={cfg.googleAdUnit ?? ''}
            onChange={(e) => setCfg((c) => ({ ...c, googleAdUnit: e.target.value }))}
            placeholder="1234567890"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Rotação (s, 0 ou 5–600)
          <Input
            type="number"
            min={0}
            max={600}
            aria-label={`Rotação ${slug}`}
            value={cfg.rotateSeconds}
            onChange={(e) => setCfg((c) => ({ ...c, rotateSeconds: Number(e.target.value) }))}
          />
        </label>
      </div>

      {def.mounted === false && (
        <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sem posição montada no app: este slot ainda não aparece em nenhuma tela.
        </p>
      )}

      {noUnit && (
        <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Google marcado sem ad unit, o Google não será exibido.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => void save()} disabled={saving} aria-label={`Salvar ${slug}`}>
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
          Salvar
        </Button>
        {message && (
          <span
            className={
              message.ok
                ? 'flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300'
                : 'text-xs text-red-700 dark:text-red-300'
            }
          >
            {message.ok && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {message.text}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {totals
            ? `30 dias: ${totals.impressions} imp. · ${totals.clicks} cliques · CTR (criativos próprios) ${formatCtr(ownCtr)}`
            : '30 dias: —'}
        </span>
      </div>
    </li>
  );
}

export function AdsSlotsTab() {
  const [rows, setRows] = useState<AdSlotConfig[] | null>(null);
  const [stats, setStats] = useState<AdStatRow[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/resources/ad_slots?pageSize=100', { cache: 'no-store' });
      const body = (await res.json().catch(() => null)) as { items?: AdSlotConfig[]; message?: string } | null;
      if (!res.ok) throw new Error(body?.message ?? 'Não foi possível carregar os slots.');
      setRows(body?.items ?? []);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os slots.');
    }
    fetchAdStats(rangeFrom(30))
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bySlug = useMemo(() => new Map((rows ?? []).map((r) => [r.slug, r])), [rows]);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando slots…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      <ul className="grid gap-3 lg:grid-cols-2">
        {AD_SLOT_CATALOG.map((def) => (
          <SlotCard
            key={def.slug}
            def={def}
            initial={{ ...DEFAULTS, ...bySlug.get(def.slug), slug: def.slug }}
            stats={stats}
          />
        ))}
      </ul>
    </div>
  );
}
