'use client';

import { useMemo, useState } from 'react';
import { FileText, Lock, Plus, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { MarkdownEditor } from '../ui/markdown-editor';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';
import { useTable } from '../../hooks/use-table';
import { cn } from '../../../lib/utils';
import { slugify } from './slugify';
import { isReservedSlug } from './reserved-slugs';
import type { PageRecord } from './page-types';

/**
 * Admin master/detail manager for the `pages` plugin table. Migrated from the external template's
 * `admin.paginas.tsx` (which was localStorage-backed) to talk to `/api/resources/pages`:
 *
 * - list via `useTable` (resource `pages`, ordered by title)
 * - create via `POST /api/resources/pages`
 * - edit via `PATCH /api/resources/pages/:id`
 * - "delete" is a soft delete — `PATCH { active: false }`
 * - slug auto-derives from the title (`slugify`) until the user unlocks the field
 * - status toggle draft <-> published
 *
 * After any mutation it best-effort pings `/api/pages/revalidate` so the consuming app can drop
 * the cached `/[slug]` route (foco-total ships that route; the call is swallowed if absent).
 *
 * `reservedSlugs` — the consuming app's own top-level route names, rejected in the create/edit
 * form on top of the framework defaults.
 */
export function PagesAdmin({ reservedSlugs = [] }: { reservedSlugs?: string[] }) {
  const table = useTable<PageRecord>({
    resource: 'pages',
    orderBy: 'title',
    orderDirection: 'asc',
    pageSize: 100,
  });

  const pages = useMemo(
    () => [...table.items].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    [table.items],
  );

  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [creating, setCreating] = useState(false);

  const current = pages.find((p) => String(p.id) === String(selectedId)) ?? pages[0] ?? null;

  async function pingRevalidate(slug: string, previousSlug?: string) {
    try {
      await fetch('/api/pages/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, previousSlug }),
      });
    } catch {
      /* consuming app may not expose this route — non-fatal */
    }
  }

  async function createPage(title: string) {
    const t = title.trim();
    if (!t) return;
    const slug = slugify(t);
    if (!slug) {
      toast.error('Não foi possível gerar um endereço a partir desse título.');
      return;
    }
    if (isReservedSlug(slug, reservedSlugs)) {
      toast.error(`O endereço "/${slug}" é reservado. Escolha outro título.`);
      return;
    }
    if (pages.some((p) => p.slug === slug)) {
      toast.error('Já existe uma página com esse endereço.');
      return;
    }
    const res = await fetch('/api/resources/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: t,
        slug,
        description: '',
        content: `# ${t}\n\nEscreva o conteúdo desta página em **markdown**.\n`,
        status: 'draft',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.message || 'Não foi possível criar a página.');
      return;
    }
    toast.success('Página criada');
    setCreating(false);
    await table.refresh();
    const created = (data.item ?? data) as PageRecord;
    if (created?.id != null) setSelectedId(created.id);
    await pingRevalidate(slug);
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="text-sm font-semibold">Páginas ({pages.length})</h2>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nova
          </Button>
        </div>
        {table.error ? (
          <p className="p-3 text-sm text-destructive">{table.error}</p>
        ) : null}
        <div className="max-h-[70vh] overflow-y-auto p-2">
          {pages.map((p) => (
            <button
              key={String(p.id)}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={cn(
                'flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition',
                String(current?.id) === String(p.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="h-3.5 w-3.5" /> {p.title}
              </span>
              <span
                className={cn(
                  'text-xs',
                  String(current?.id) === String(p.id)
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground',
                )}
              >
                /{p.slug} · {p.status === 'published' ? 'publicada' : 'rascunho'}
              </span>
            </button>
          ))}
          {!table.loading && pages.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              Nenhuma página. Crie uma nova acima.
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        {current ? (
          <PageEditor
            key={String(current.id)}
            page={current}
            reservedSlugs={reservedSlugs}
            existingSlugs={pages.map((p) => p.slug)}
            onSaved={async (info) => {
              await table.refresh();
              await pingRevalidate(info.slug, info.previousSlug);
            }}
            onDeleted={async (slug) => {
              setSelectedId(null);
              await table.refresh();
              await pingRevalidate(slug);
            }}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Selecione uma página à esquerda ou crie uma nova.
          </div>
        )}
      </div>

      <NewPageDialog
        open={creating}
        reservedSlugs={reservedSlugs}
        onCancel={() => setCreating(false)}
        onConfirm={createPage}
      />
    </div>
  );
}

function NewPageDialog({
  open,
  reservedSlugs,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  reservedSlugs: string[];
  onCancel: () => void;
  onConfirm: (title: string) => void | Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const slug = slugify(title);
  const reserved = slug ? isReservedSlug(slug, reservedSlugs) : false;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg">
        <h3 className="text-base font-semibold">Nova página</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Dê um título — o endereço é gerado automaticamente.
        </p>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="new-page-title">Título</Label>
          <Input
            id="new-page-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Central de ajuda"
          />
          {title ? (
            <p className={cn('text-xs', reserved ? 'text-destructive' : 'text-muted-foreground')}>
              Endereço: <code>/{slug || '...'}</code>
              {reserved ? ' — reservado, escolha outro título' : ''}
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            disabled={!title.trim() || !slug || reserved}
            onClick={() => void onConfirm(title)}
          >
            Criar
          </Button>
        </div>
      </div>
    </div>
  );
}

function PageEditor({
  page,
  reservedSlugs,
  existingSlugs,
  onSaved,
  onDeleted,
}: {
  page: PageRecord;
  reservedSlugs: string[];
  existingSlugs: string[];
  onSaved: (info: { slug: string; previousSlug?: string }) => void | Promise<void>;
  onDeleted: (slug: string) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [slugLocked, setSlugLocked] = useState(true);
  const [description, setDescription] = useState(page.description ?? '');
  const [content, setContent] = useState(page.content);
  const [status, setStatus] = useState<string>(page.status);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const effectiveSlug = slugLocked ? slugify(title) : slugify(slug);
  const slugReserved = effectiveSlug ? isReservedSlug(effectiveSlug, reservedSlugs) : true;
  const slugCollides =
    effectiveSlug !== page.slug && existingSlugs.includes(effectiveSlug);

  const dirty =
    title !== page.title ||
    effectiveSlug !== page.slug ||
    description !== (page.description ?? '') ||
    content !== page.content ||
    status !== page.status;

  async function save() {
    if (!effectiveSlug || slugReserved) {
      toast.error('Endereço inválido ou reservado.');
      return;
    }
    if (slugCollides) {
      toast.error('Já existe outra página com esse endereço.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/resources/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || page.title,
          slug: effectiveSlug,
          description: description.trim(),
          content,
          status: status === 'published' ? 'published' : 'draft',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || 'Não foi possível salvar a página.');
        return;
      }
      toast.success('Página salva');
      await onSaved({
        slug: effectiveSlug,
        previousSlug: effectiveSlug !== page.slug ? page.slug : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function softDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/resources/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || 'Não foi possível excluir a página.');
        return;
      }
      toast.success('Página excluída');
      setConfirmDelete(false);
      await onDeleted(page.slug);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-title">Título</Label>
              <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-slug" className="flex items-center gap-2">
                Endereço
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSlugLocked((locked) => {
                      if (locked) setSlug(effectiveSlug);
                      return !locked;
                    });
                  }}
                >
                  {slugLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {slugLocked ? 'derivado do título' : 'manual'}
                </button>
              </Label>
              <Input
                id="p-slug"
                value={slugLocked ? effectiveSlug : slug}
                disabled={slugLocked}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p
                className={cn(
                  'text-xs',
                  slugReserved || slugCollides ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                Público em <code>/{effectiveSlug || '...'}</code>
                {slugReserved ? ' — reservado' : slugCollides ? ' — já em uso' : ''}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-desc">Descrição (SEO)</Label>
              <Textarea
                id="p-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumo curto que aparece em buscadores"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="p-status"
                checked={status === 'published'}
                onCheckedChange={(checked) => setStatus(checked ? 'published' : 'draft')}
              />
              <Label htmlFor="p-status" className="text-sm">
                {status === 'published' ? 'Publicada' : 'Rascunho'}
              </Label>
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-between gap-2 sm:items-end">
            <Button onClick={save} disabled={!dirty || saving || slugReserved || slugCollides}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              Excluir
            </Button>
          </div>
        </div>
      </div>

      <MarkdownEditor value={content} onChange={setContent} height={480} />

      <ConfirmDialog
        open={confirmDelete}
        title={`Excluir "${page.title}"?`}
        description={`A página deixará de aparecer em /${page.slug}. Ela é apenas desativada (exclusão reversível pelo banco).`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={() => void softDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
