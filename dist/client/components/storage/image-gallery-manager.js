'use client';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, CheckCircle2, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '../ui/card';
const MAX_IMAGES = 3;
const ACCEPTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'gif', 'png', 'heic', 'heif', 'webp']);
const ACCEPTED_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/webp',
]);
function isAcceptedImageFile(file) {
    const fileName = String(file.name ?? '')
        .trim()
        .toLowerCase();
    const extension = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';
    const mimeType = String(file.type ?? '')
        .trim()
        .toLowerCase();
    return ACCEPTED_IMAGE_EXTENSIONS.has(extension) || ACCEPTED_IMAGE_MIME_TYPES.has(mimeType);
}
function normalizeIds(values) {
    // public.files.id is a uuid (see kizuna-core/plugins/storage/0001_storage.sql) — just require a
    // non-empty, deduplicated id — no type assumption about its shape.
    return values
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0)
        .filter((value, index, array) => array.indexOf(value) === index);
}
function formatBytes(value) {
    if (!Number.isFinite(value) || value <= 0)
        return '0 KB';
    if (value < 1024 * 1024)
        return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}
export function ImageGalleryManager({ referenceId, initialImageIds, accept = '.jpg,.jpeg,.gif,.png,.heic,.heif,.webp,image/jpeg,image/png,image/gif,image/heic,image/heif,image/webp', purpose = 'image', maxFileSizeMb = 5, onSaved, onPersist, }) {
    const [items, setItems] = useState([]);
    const [selectedIds, setSelectedIds] = useState(normalizeIds(initialImageIds));
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [busyDeleteIds, setBusyDeleteIds] = useState(new Set());
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [previewItem, setPreviewItem] = useState(null);
    const hydratedKeyRef = useRef('');
    const hydrateKey = useMemo(() => [referenceId, normalizeIds(initialImageIds).join(',')].join('|'), [referenceId, initialImageIds]);
    const visibleItems = useMemo(() => {
        const order = normalizeIds(selectedIds);
        const byId = new Map(items.map((item) => [String(item.id), item]));
        return order
            .map((id) => byId.get(id))
            .filter((item) => Boolean(item));
    }, [items, selectedIds]);
    useEffect(() => {
        if (hydratedKeyRef.current === hydrateKey)
            return;
        hydratedKeyRef.current = hydrateKey;
        setSelectedIds(normalizeIds(initialImageIds));
    }, [hydrateKey, initialImageIds]);
    useEffect(() => {
        const ids = normalizeIds(selectedIds);
        if (ids.length === 0) {
            return;
        }
        const controller = new AbortController();
        async function loadFiles() {
            setLoading(true);
            setError('');
            try {
                const query = new URLSearchParams({
                    ids: ids.join(','),
                    purpose,
                    active: 'true',
                    limit: String(Math.max(ids.length, 20)),
                });
                const response = await fetch(`/api/storage/files?${query.toString()}`, {
                    method: 'GET',
                    signal: controller.signal,
                });
                const data = (await response.json().catch(() => null)) ?? null;
                if (!response.ok) {
                    setError(data?.message ?? 'Nao foi possivel carregar as imagens.');
                    setItems([]);
                    return;
                }
                const loaded = Array.isArray(data?.items) ? data.items : [];
                const byId = new Map(loaded.map((item) => [String(item.id), item]));
                const ordered = ids
                    .map((id) => byId.get(id))
                    .filter((item) => Boolean(item));
                setItems(ordered);
            }
            catch {
                if (!controller.signal.aborted) {
                    setError('Nao foi possivel carregar as imagens.');
                    setItems([]);
                }
            }
            finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }
        void loadFiles();
        return () => controller.abort();
    }, [purpose, selectedIds]);
    async function persistImageIds(nextIds, successMessage) {
        const savedIds = await onPersist(referenceId, nextIds);
        const normalized = normalizeIds(savedIds);
        setSelectedIds(normalized);
        onSaved(normalized);
        setSuccess(successMessage);
        return normalized;
    }
    async function handleUpload(files) {
        if (!files || files.length === 0)
            return;
        setUploading(true);
        setError('');
        setSuccess('');
        try {
            const remainingSlots = Math.max(0, MAX_IMAGES - selectedIds.length);
            if (remainingSlots <= 0) {
                setError(`Limite de ${MAX_IMAGES} imagens atingido.`);
                return;
            }
            const form = new FormData();
            const selectedFiles = Array.from(files);
            const invalidFiles = selectedFiles.filter((file) => !isAcceptedImageFile(file));
            if (invalidFiles.length > 0) {
                setError('Envie apenas arquivos JPG, GIF, PNG, HEIC ou WEBP.');
                return;
            }
            const queue = selectedFiles.slice(0, remainingSlots);
            if (selectedFiles.length > remainingSlots) {
                setError(`Voce pode manter no maximo ${MAX_IMAGES} imagens.`);
            }
            queue.forEach((file) => {
                form.append('files', file);
            });
            form.append('purpose', purpose);
            form.append('maxFileSizeMb', String(maxFileSizeMb));
            form.append('optimizeImages', 'true');
            const response = await fetch('/api/storage/files', {
                method: 'POST',
                body: form,
            });
            const data = (await response.json().catch(() => null)) ?? null;
            if (!response.ok) {
                setError(data?.message ?? 'Nao foi possivel realizar upload das imagens.');
                return;
            }
            const uploaded = Array.isArray(data?.uploaded) ? data.uploaded : [];
            const errors = Array.isArray(data?.errors) ? data.errors : [];
            if (uploaded.length > 0) {
                const uploadedIds = uploaded.map((item) => String(item.id));
                const nextIds = normalizeIds([...selectedIds, ...uploadedIds]);
                await persistImageIds(nextIds, 'Imagens vinculadas e salvas com sucesso.');
            }
            if (errors.length > 0) {
                setError(errors.map((item) => `${item.fileName}: ${item.message}`).join(' | '));
            }
        }
        catch {
            setError('Nao foi possivel realizar upload das imagens.');
        }
        finally {
            setUploading(false);
        }
    }
    async function handleRemove(fileId) {
        const id = String(fileId);
        setBusyDeleteIds((prev) => new Set([...prev, id]));
        setError('');
        setSuccess('');
        try {
            const nextIds = selectedIds.filter((item) => item !== id);
            await persistImageIds(nextIds, 'Imagem desvinculada com sucesso.');
        }
        catch {
            setError('Nao foi possivel desvincular a imagem.');
        }
        finally {
            setBusyDeleteIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardDescription, { children: ["At\u00E9 ", MAX_IMAGES, " fotos nos formatos JPG, GIF, PNG, HEIC ou WEBP. (Tamanho m\u00E1ximo de", ' ', maxFileSizeMb, " MB por arquivo)"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [error ? (_jsxs("div", { className: "flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300", children: [_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: error })] })) : null, success ? (_jsxs("div", { className: "flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300", children: [_jsx(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" }), _jsx("p", { children: success })] })) : null, _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs("label", { htmlFor: "image-gallery-upload", className: "inline-flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm font-medium text-foreground transition hover:bg-accent", children: [_jsx(Upload, { className: "h-4 w-4" }), uploading ? 'Enviando...' : 'Selecionar arquivos'] }) }), _jsx("input", { id: "image-gallery-upload", type: "file", accept: accept, multiple: true, className: "hidden h-4", onChange: (event) => {
                                    void handleUpload(event.target.files);
                                    event.currentTarget.value = '';
                                } })] }), _jsxs("div", { className: "space-y-2", children: [loading ? (_jsx("div", { className: "space-y-2", "aria-busy": "true", "aria-label": "Carregando imagens", children: [0, 1].map((i) => (_jsxs("div", { className: "flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-3", children: [_jsx("div", { className: "h-14 w-14 shrink-0 animate-pulse rounded-lg bg-muted" }), _jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [_jsx("div", { className: "h-3 w-2/3 animate-pulse rounded bg-muted" }), _jsx("div", { className: "h-2.5 w-1/3 animate-pulse rounded bg-muted" })] })] }, i))) })) : null, !loading && visibleItems.length === 0 ? (_jsx("p", { className: "rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground", children: "Nenhuma imagem vinculada ainda." })) : null, !loading && visibleItems.length > 0 ? (_jsx("div", { className: "space-y-2", children: visibleItems.map((item, index) => {
                                    const deleting = busyDeleteIds.has(String(item.id));
                                    const isImage = (item.mimeType ?? '').startsWith('image/');
                                    const isCover = index === 0;
                                    return (_jsxs("div", { className: "flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-3 transition-colors hover:border-border", children: [_jsx("button", { type: "button", onClick: () => {
                                                    if (isImage) {
                                                        setPreviewItem(item);
                                                    }
                                                }, className: "relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20", disabled: !isImage, children: isImage ? (_jsx(Image, { src: `/api/storage/files/${item.id}/content`, alt: item.originalName, width: 112, height: 112, className: "h-14 w-14 object-cover", loading: "lazy", unoptimized: true })) : (_jsx("div", { className: "flex h-14 w-14 items-center justify-center text-[10px] text-muted-foreground", children: "Sem miniatura" })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("p", { className: "truncate text-sm font-medium text-foreground", children: item.originalName }), isCover ? (_jsx("span", { className: "shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary", children: "Capa" })) : null] }), _jsx("p", { className: "truncate text-xs text-muted-foreground", children: formatBytes(item.sizeBytes) })] }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "shrink-0 text-muted-foreground hover:text-destructive", onClick: () => {
                                                    void handleRemove(String(item.id));
                                                }, disabled: deleting, "aria-label": `Desvincular ${item.originalName}`, children: deleting ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(Trash2, { className: "h-4 w-4" })) })] }, item.id));
                                }) })) : null] })] }), previewItem ? (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4", onClick: () => setPreviewItem(null), role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: "relative w-full max-w-5xl", onClick: (event) => event.stopPropagation(), children: [_jsx("button", { type: "button", onClick: () => setPreviewItem(null), className: "absolute right-2 top-2 rounded-md bg-black/60 p-2 text-white hover:bg-black/80", "aria-label": "Fechar visualizacao", children: _jsx(X, { className: "h-4 w-4" }) }), _jsx(Image, { src: `/api/storage/files/${previewItem.id}/content`, alt: previewItem.originalName, width: 1600, height: 1200, className: "max-h-[85vh] w-full rounded-md object-contain", unoptimized: true })] }) })) : null] }));
}
//# sourceMappingURL=image-gallery-manager.js.map