'use client';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
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
export function PagesAdmin({ reservedSlugs = [] }) {
    const table = useTable({
        resource: 'pages',
        orderBy: 'title',
        orderDirection: 'asc',
        pageSize: 100,
    });
    const pages = useMemo(() => [...table.items].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')), [table.items]);
    const [selectedId, setSelectedId] = useState(null);
    const [creating, setCreating] = useState(false);
    const current = pages.find((p) => String(p.id) === String(selectedId)) ?? pages[0] ?? null;
    async function pingRevalidate(slug, previousSlug) {
        try {
            await fetch('/api/pages/revalidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, previousSlug }),
            });
        }
        catch {
            /* consuming app may not expose this route — non-fatal */
        }
    }
    async function createPage(title) {
        const t = title.trim();
        if (!t)
            return;
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
        const created = (data.item ?? data);
        if (created?.id != null)
            setSelectedId(created.id);
        await pingRevalidate(slug);
    }
    return (_jsxs("div", { className: "mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]", children: [_jsxs("div", { className: "rounded-2xl border border-border bg-card", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border p-3", children: [_jsxs("h2", { className: "text-sm font-semibold", children: ["P\u00E1ginas (", pages.length, ")"] }), _jsxs(Button, { size: "sm", onClick: () => setCreating(true), children: [_jsx(Plus, { className: "mr-1 h-4 w-4" }), " Nova"] })] }), table.error ? _jsx("p", { className: "p-3 text-sm text-destructive", children: table.error }) : null, _jsxs("div", { className: "max-h-[70vh] overflow-y-auto p-2", children: [pages.map((p) => (_jsxs("button", { type: "button", onClick: () => setSelectedId(p.id), className: cn('flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition', String(current?.id) === String(p.id)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'), children: [_jsxs("span", { className: "flex items-center gap-1.5 text-sm font-medium", children: [_jsx(FileText, { className: "h-3.5 w-3.5" }), " ", p.title] }), _jsxs("span", { className: cn('text-xs', String(current?.id) === String(p.id)
                                            ? 'text-primary-foreground/80'
                                            : 'text-muted-foreground'), children: ["/", p.slug, " \u00B7 ", p.status === 'published' ? 'publicada' : 'rascunho'] })] }, String(p.id)))), !table.loading && pages.length === 0 ? (_jsx("p", { className: "p-3 text-sm text-muted-foreground", children: "Nenhuma p\u00E1gina. Crie uma nova acima." })) : null] })] }), _jsx("div", { className: "min-w-0", children: current ? (_jsx(PageEditor, { page: current, reservedSlugs: reservedSlugs, existingSlugs: pages.map((p) => p.slug), onSaved: async (info) => {
                        await table.refresh();
                        await pingRevalidate(info.slug, info.previousSlug);
                    }, onDeleted: async (slug) => {
                        setSelectedId(null);
                        await table.refresh();
                        await pingRevalidate(slug);
                    } }, String(current.id))) : (_jsx("div", { className: "rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground", children: "Selecione uma p\u00E1gina \u00E0 esquerda ou crie uma nova." })) }), _jsx(NewPageDialog, { open: creating, reservedSlugs: reservedSlugs, onCancel: () => setCreating(false), onConfirm: createPage })] }));
}
function NewPageDialog({ open, reservedSlugs, onCancel, onConfirm, }) {
    const [title, setTitle] = useState('');
    const slug = slugify(title);
    const reserved = slug ? isReservedSlug(slug, reservedSlugs) : false;
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg", children: [_jsx("h3", { className: "text-base font-semibold", children: "Nova p\u00E1gina" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "D\u00EA um t\u00EDtulo \u2014 o endere\u00E7o \u00E9 gerado automaticamente." }), _jsxs("div", { className: "mt-4 grid gap-2", children: [_jsx(Label, { htmlFor: "new-page-title", children: "T\u00EDtulo" }), _jsx(Input, { id: "new-page-title", autoFocus: true, value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Ex.: Central de ajuda" }), title ? (_jsxs("p", { className: cn('text-xs', reserved ? 'text-destructive' : 'text-muted-foreground'), children: ["Endere\u00E7o: ", _jsxs("code", { children: ["/", slug || '...'] }), reserved ? ' — reservado, escolha outro título' : ''] })) : null] }), _jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onCancel, children: "Cancelar" }), _jsx(Button, { disabled: !title.trim() || !slug || reserved, onClick: () => void onConfirm(title), children: "Criar" })] })] }) }));
}
function PageEditor({ page, reservedSlugs, existingSlugs, onSaved, onDeleted, }) {
    const [title, setTitle] = useState(page.title);
    const [slug, setSlug] = useState(page.slug);
    const [slugLocked, setSlugLocked] = useState(true);
    const [description, setDescription] = useState(page.description ?? '');
    const [content, setContent] = useState(page.content);
    const [status, setStatus] = useState(page.status);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const effectiveSlug = slugLocked ? slugify(title) : slugify(slug);
    const slugReserved = effectiveSlug ? isReservedSlug(effectiveSlug, reservedSlugs) : true;
    const slugCollides = effectiveSlug !== page.slug && existingSlugs.includes(effectiveSlug);
    const dirty = title !== page.title ||
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
        }
        finally {
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
        }
        finally {
            setDeleting(false);
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded-2xl border border-border bg-card p-4", children: _jsxs("div", { className: "grid gap-3 sm:grid-cols-[1fr_auto]", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid gap-1.5", children: [_jsx(Label, { htmlFor: "p-title", children: "T\u00EDtulo" }), _jsx(Input, { id: "p-title", value: title, onChange: (e) => setTitle(e.target.value) })] }), _jsxs("div", { className: "grid gap-1.5", children: [_jsxs(Label, { htmlFor: "p-slug", className: "flex items-center gap-2", children: ["Endere\u00E7o", _jsxs("button", { type: "button", className: "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground", onClick: () => {
                                                        setSlugLocked((locked) => {
                                                            if (locked)
                                                                setSlug(effectiveSlug);
                                                            return !locked;
                                                        });
                                                    }, children: [slugLocked ? _jsx(Lock, { className: "h-3 w-3" }) : _jsx(Unlock, { className: "h-3 w-3" }), slugLocked ? 'derivado do título' : 'manual'] })] }), _jsx(Input, { id: "p-slug", value: slugLocked ? effectiveSlug : slug, disabled: slugLocked, onChange: (e) => setSlug(e.target.value) }), _jsxs("p", { className: cn('text-xs', slugReserved || slugCollides ? 'text-destructive' : 'text-muted-foreground'), children: ["P\u00FAblico em ", _jsxs("code", { children: ["/", effectiveSlug || '...'] }), slugReserved ? ' — reservado' : slugCollides ? ' — já em uso' : ''] })] }), _jsxs("div", { className: "grid gap-1.5", children: [_jsx(Label, { htmlFor: "p-desc", children: "Descri\u00E7\u00E3o (SEO)" }), _jsx(Textarea, { id: "p-desc", rows: 2, value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Resumo curto que aparece em buscadores" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Switch, { id: "p-status", checked: status === 'published', onCheckedChange: (checked) => setStatus(checked ? 'published' : 'draft') }), _jsx(Label, { htmlFor: "p-status", className: "text-sm", children: status === 'published' ? 'Publicada' : 'Rascunho' })] })] }), _jsxs("div", { className: "flex flex-col items-stretch justify-between gap-2 sm:items-end", children: [_jsx(Button, { onClick: save, disabled: !dirty || saving || slugReserved || slugCollides, children: saving ? 'Salvando...' : 'Salvar' }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setConfirmDelete(true), children: "Excluir" })] })] }) }), _jsx(MarkdownEditor, { value: content, onChange: setContent, height: 480 }), _jsx(ConfirmDialog, { open: confirmDelete, title: `Excluir "${page.title}"?`, description: `A página deixará de aparecer em /${page.slug}. Ela é apenas desativada (exclusão reversível pelo banco).`, confirmLabel: "Excluir", loading: deleting, onConfirm: () => void softDelete(), onCancel: () => setConfirmDelete(false) })] }));
}
//# sourceMappingURL=PagesAdmin.js.map