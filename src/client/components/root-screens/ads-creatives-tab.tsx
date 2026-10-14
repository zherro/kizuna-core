'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ImageIcon, Loader2, Plus } from 'lucide-react';
import {
  AD_FORMAT_SPECS,
  AD_FORMATS,
  AD_KINDS,
  AD_SLOT_CATALOG,
  type AdCreative,
  type AdFormat,
  type AdKind,
} from '../../../shared/ads';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';

type Draft = {
  id: string | null;
  format: AdFormat;
  kind: AdKind;
  imageUrl: string;
  alt: string;
  linkUrl: string;
  label: string;
  weight: string;
  startsAt: string;
  endsAt: string;
  cities: string;
  slots: string[];
  active: boolean;
};

const EMPTY: Draft = {
  id: null,
  format: 'banner',
  kind: 'imagem',
  imageUrl: '',
  alt: '',
  linkUrl: '',
  label: '',
  weight: '100',
  startsAt: '',
  endsAt: '',
  cities: '',
  slots: [],
  active: true,
};

const selectClass =
  'h-9 w-full rounded-[var(--ui-radius-pill,0.375rem)] border border-input bg-background px-3 text-sm';

/**
 * Vigência: a data escolhida vale no fuso LOCAL do navegador do root. `startsAt` vira o início do
 * dia (00:00:00.000) e `endsAt` o fim do dia (23:59:59.999), ambos serializados em ISO (UTC).
 * Na volta, `fromIso` lê a data pelo fuso local, reconstituindo o mesmo dia exibido.
 */
export function startOfDayIso(d: string): string | null {
  return d ? new Date(`${d}T00:00:00.000`).toISOString() : null;
}
export function endOfDayIso(d: string): string | null {
  return d ? new Date(`${d}T23:59:59.999`).toISOString() : null;
}
export function fromIso(v: string | null): string {
  if (!v) return '';
  const t = new Date(v);
  if (Number.isNaN(t.getTime())) return v.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

function toDraft(c: AdCreative): Draft {
  return {
    id: c.id,
    format: c.format,
    kind: c.kind,
    imageUrl: c.imageUrl,
    alt: c.alt,
    linkUrl: c.linkUrl,
    label: c.label,
    weight: String(c.weight),
    startsAt: fromIso(c.startsAt),
    endsAt: fromIso(c.endsAt),
    cities: c.cities.join(', '),
    slots: c.slots,
    active: c.active,
  };
}

function validate(d: Draft, file: File | null): string {
  const hasFile = Boolean(file);
  if (!/^https?:\/\/\S+$/i.test(d.linkUrl.trim())) return 'Link deve começar com http:// ou https://.';
  const w = Number(d.weight);
  if (d.weight.trim() === '' || !Number.isFinite(w) || w < 0 || w > 1000) return 'Peso deve ficar entre 0 e 1000.';
  if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) return 'Fim deve ser igual ou posterior ao início.';
  if (file) {
    const isGif = file.type === 'image/gif';
    if (d.kind === 'gif' && !isGif) return 'Tipo GIF exige um arquivo .gif (image/gif).';
    if (d.kind === 'imagem' && isGif) return 'Arquivo GIF: escolha o tipo gif.';
  }
  if (!hasFile && !d.imageUrl) return 'Envie um arquivo de imagem ou GIF.';
  return '';
}

async function upload(file: File, kind: AdKind): Promise<string> {
  const form = new FormData();
  form.append('files', file);
  form.append('purpose', 'banner');
  // GIF animado não pode passar pelo otimizador (perderia os quadros).
  form.append('optimizeImages', kind === 'gif' ? 'false' : 'true');
  const res = await fetch('/api/storage/files', { method: 'POST', body: form });
  const body = (await res.json().catch(() => null)) as {
    message?: string;
    uploaded?: Array<{ id: string }>;
    errors?: Array<{ message: string }>;
  } | null;
  const id = body?.uploaded?.[0]?.id;
  if (!res.ok || !id) throw new Error(body?.errors?.[0]?.message ?? body?.message ?? 'Falha ao enviar o arquivo.');
  return `/api/public/storage/files/${id}/content`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function periodText(c: AdCreative) {
  if (!c.startsAt && !c.endsAt) return 'Sempre';
  return `${fromIso(c.startsAt) || '…'} a ${fromIso(c.endsAt) || '…'}`;
}

export function AdsCreativesTab() {
  const [items, setItems] = useState<AdCreative[] | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const all: AdCreative[] = [];
      for (let page = 1; page <= 20; page += 1) {
        const res = await fetch(`/api/resources/ad_creatives?pageSize=200&page=${page}`, { cache: 'no-store' });
        const body = (await res.json().catch(() => null)) as { items?: AdCreative[]; message?: string } | null;
        if (!res.ok) throw new Error(body?.message ?? 'Não foi possível carregar os criativos.');
        const got = body?.items ?? [];
        all.push(...got);
        if (got.length < 200) break;
      }
      setItems(all);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os criativos.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function open(next: Draft) {
    setDraft(next);
    setFile(null);
    setFormError('');
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  async function save() {
    if (!draft) return;
    const problem = validate(draft, file);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const imageUrl = file ? await upload(file, draft.kind) : draft.imageUrl;
      const payload = {
        format: draft.format,
        kind: draft.kind,
        imageUrl,
        alt: draft.alt.trim(),
        linkUrl: draft.linkUrl.trim(),
        label: draft.label.trim(),
        weight: Number(draft.weight),
        startsAt: startOfDayIso(draft.startsAt),
        endsAt: endOfDayIso(draft.endsAt),
        cities: draft.cities.split(',').map((s) => s.trim()).filter(Boolean),
        slots: draft.slots,
        active: draft.active,
      };
      const res = await fetch(draft.id ? `/api/resources/ad_creatives/${draft.id}` : '/api/resources/ad_creatives', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(body?.message ?? 'Não foi possível salvar o criativo.');
      setDraft(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o criativo.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: AdCreative, active: boolean) {
    setItems((prev) => prev?.map((x) => (x.id === c.id ? { ...x, active } : x)) ?? prev);
    try {
      const res = await fetch(`/api/resources/ad_creatives/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError('Não foi possível alterar o estado do criativo.');
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Criativos próprios. Para parar de exibir, desative (não há exclusão).
        </p>
        <Button size="sm" className="ml-auto" onClick={() => open(EMPTY)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Novo criativo
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {items === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando criativos…
        </p>
      ) : items.length === 0 && !error ? (
        <EmptyStateCard
          icon={ImageIcon}
          title="Nenhum criativo"
          description="Crie o primeiro banner ou GIF para exibir nos slots de publicidade."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt={c.alt} className="h-12 w-20 rounded bg-muted object-cover" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => open(toDraft(c))}
                  className="block max-w-full truncate text-left text-sm font-semibold hover:underline"
                >
                  {c.label || c.alt || c.id.slice(0, 8)}
                </button>
                <p className="truncate text-xs text-muted-foreground">
                  {AD_FORMAT_SPECS[c.format]?.label ?? c.format} · {periodText(c)} · peso {c.weight}
                  {c.cities.length > 0 ? ` · ${c.cities.join(', ')}` : ''}
                </p>
              </div>
              <Badge variant="outline">{c.kind}</Badge>
              <Switch
                aria-label={`Ativo ${c.label || c.id}`}
                checked={c.active}
                onCheckedChange={(v) => void toggleActive(c, v)}
              />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <SheetContent className="max-w-lg">
          <SheetHeader>
            <SheetTitle>{draft?.id ? 'Editar criativo' : 'Novo criativo'}</SheetTitle>
          </SheetHeader>
          {draft && (
            <div className="flex flex-col gap-3 p-4">
              <Field label="Rótulo">
                <Input aria-label="Rótulo" value={draft.label} onChange={(e) => set({ label: e.target.value })} />
              </Field>
              <Field label="Link">
                <Input
                  aria-label="Link"
                  value={draft.linkUrl}
                  placeholder="https://"
                  onChange={(e) => set({ linkUrl: e.target.value })}
                />
              </Field>
              <Field label="Texto alternativo">
                <Input aria-label="Texto alternativo" value={draft.alt} onChange={(e) => set({ alt: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Formato">
                  <select
                    aria-label="Formato"
                    className={selectClass}
                    value={draft.format}
                    onChange={(e) => set({ format: e.target.value as AdFormat })}
                  >
                    {AD_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {AD_FORMAT_SPECS[f].label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tipo">
                  <select
                    aria-label="Tipo"
                    className={selectClass}
                    value={draft.kind}
                    onChange={(e) => set({ kind: e.target.value as AdKind })}
                  >
                    {AD_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Arquivo">
                <Input
                  type="file"
                  aria-label="Arquivo"
                  accept={draft.kind === 'gif' ? 'image/gif' : 'image/*'}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              {draft.imageUrl && !file && (
                <p className="truncate text-xs text-muted-foreground">Atual: {draft.imageUrl}</p>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Peso">
                  <Input
                    type="number"
                    aria-label="Peso"
                    min={0}
                    max={1000}
                    value={draft.weight}
                    onChange={(e) => set({ weight: e.target.value })}
                  />
                </Field>
                <Field label="Início">
                  <Input
                    type="date"
                    aria-label="Início"
                    value={draft.startsAt}
                    onChange={(e) => set({ startsAt: e.target.value })}
                  />
                </Field>
                <Field label="Fim">
                  <Input
                    type="date"
                    aria-label="Fim"
                    value={draft.endsAt}
                    onChange={(e) => set({ endsAt: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Cidades (separadas por vírgula; vazio = todas)">
                <Input aria-label="Cidades" value={draft.cities} onChange={(e) => set({ cities: e.target.value })} />
              </Field>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 text-xs text-muted-foreground">Slots (nenhum = todos do formato)</legend>
                {AD_SLOT_CATALOG.filter((s) => s.format === draft.format).map((s) => (
                  <label key={s.slug} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      aria-label={`Slot ${s.slug}`}
                      checked={draft.slots.includes(s.slug)}
                      onCheckedChange={(on) =>
                        set({ slots: on ? [...draft.slots, s.slug] : draft.slots.filter((x) => x !== s.slug) })
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </fieldset>
              <label className="flex items-center gap-2 text-sm">
                <Switch aria-label="Ativo" checked={draft.active} onCheckedChange={(active) => set({ active })} />
                Ativo
              </label>
              {formError && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                  {formError}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={() => void save()} disabled={saving} aria-label="Salvar criativo">
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Salvar
                </Button>
                <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
