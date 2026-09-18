'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, CheckCircle2, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '../ui/card';

type StorageFileRecord = {
  id: string;
  uid?: string;
  originalName: string;
  storagePath: string;
  publicUrl: string | null;
  mimeType: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  purpose: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ImageGalleryManagerProps = {
  referenceId: string;
  initialImageIds: string[];
  accept?: string;
  purpose?: string;
  maxFileSizeMb?: number;
  /** Files allowed on upload, by extension (lowercase, no dot) and mime type — defaults to the
   *  image-only whitelist this component originally shipped with. Pass a wider set (e.g. `+pdf`)
   *  to reuse this component for mixed image/document attachments. */
  acceptedExtensions?: Iterable<string>;
  acceptedMimeTypes?: Iterable<string>;
  /** Cap on how many files can be linked at once — defaults to 3 (the service-image gallery). */
  maxFiles?: number;
  /** Overrides the default "Até N fotos..." card description — needed once `acceptedExtensions`
   *  stops being image-only, since the default text is image-specific. */
  description?: string;
  /** Hides upload/remove controls and just lists the linked files — used to display attachments
   *  on a read-only detail screen (no `onPersist` call happens in this mode). */
  readOnly?: boolean;
  onSaved: (imageIds: string[]) => void;
  /** Attach the uploaded file ids to a parent record/table. Called with
   *  `(referenceId, nextImageIds)`; must return the list of saved ids — the
   *  component sets its selection state from the returned list. Not called in `readOnly` mode. */
  onPersist?: (referenceId: string, nextImageIds: string[]) => Promise<Array<string | number>>;
};

const DEFAULT_MAX_IMAGES = 3;
const ACCEPTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'gif', 'png', 'heic', 'heif', 'webp']);
const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/webp',
]);

function isAcceptedFile(file: File, extensions: Set<string>, mimeTypes: Set<string>) {
  const fileName = String(file.name ?? '')
    .trim()
    .toLowerCase();
  const extension = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';
  const mimeType = String(file.type ?? '')
    .trim()
    .toLowerCase();

  return extensions.has(extension) || mimeTypes.has(mimeType);
}

function normalizeIds(values: Array<string | number>) {
  // public.files.id is a uuid (see kizuna-core/plugins/storage/0001_storage.sql) — just require a
  // non-empty, deduplicated id — no type assumption about its shape.
  return values
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageGalleryManager({
  referenceId,
  initialImageIds,
  accept = '.jpg,.jpeg,.gif,.png,.heic,.heif,.webp,image/jpeg,image/png,image/gif,image/heic,image/heif,image/webp',
  purpose = 'image',
  maxFileSizeMb = 5,
  acceptedExtensions,
  acceptedMimeTypes,
  maxFiles = DEFAULT_MAX_IMAGES,
  description,
  readOnly = false,
  onSaved,
  onPersist,
}: ImageGalleryManagerProps) {
  const extensionWhitelist = useMemo(
    () => new Set(acceptedExtensions ?? ACCEPTED_IMAGE_EXTENSIONS),
    [acceptedExtensions]
  );
  const mimeWhitelist = useMemo(
    () => new Set(acceptedMimeTypes ?? ACCEPTED_IMAGE_MIME_TYPES),
    [acceptedMimeTypes]
  );
  const [items, setItems] = useState<StorageFileRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(normalizeIds(initialImageIds));
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyDeleteIds, setBusyDeleteIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewItem, setPreviewItem] = useState<StorageFileRecord | null>(null);
  const hydratedKeyRef = useRef('');

  const hydrateKey = useMemo(
    () => [referenceId, normalizeIds(initialImageIds).join(',')].join('|'),
    [referenceId, initialImageIds]
  );

  const visibleItems = useMemo(() => {
    const order = normalizeIds(selectedIds);
    const byId = new Map(items.map((item) => [String(item.id), item]));
    return order
      .map((id) => byId.get(id))
      .filter((item): item is StorageFileRecord => Boolean(item));
  }, [items, selectedIds]);

  useEffect(() => {
    if (hydratedKeyRef.current === hydrateKey) return;
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

        const data =
          ((await response.json().catch(() => null)) as {
            items?: StorageFileRecord[];
            message?: string;
          } | null) ?? null;

        if (!response.ok) {
          setError(data?.message ?? 'Nao foi possivel carregar as imagens.');
          setItems([]);
          return;
        }

        const loaded = Array.isArray(data?.items) ? data.items : [];
        const byId = new Map(loaded.map((item) => [String(item.id), item]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((item): item is StorageFileRecord => Boolean(item));
        setItems(ordered);
      } catch {
        if (!controller.signal.aborted) {
          setError('Nao foi possivel carregar as imagens.');
          setItems([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadFiles();
    return () => controller.abort();
  }, [purpose, selectedIds]);

  async function persistImageIds(nextIds: string[], successMessage: string) {
    if (!onPersist) return nextIds;
    const savedIds = await onPersist(referenceId, nextIds);
    const normalized = normalizeIds(savedIds);
    setSelectedIds(normalized);
    onSaved(normalized);
    setSuccess(successMessage);
    return normalized;
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const remainingSlots = Math.max(0, maxFiles - selectedIds.length);
      if (remainingSlots <= 0) {
        setError(`Limite de ${maxFiles} arquivos atingido.`);
        return;
      }

      const form = new FormData();
      const selectedFiles = Array.from(files);
      const invalidFiles = selectedFiles.filter(
        (file) => !isAcceptedFile(file, extensionWhitelist, mimeWhitelist)
      );

      if (invalidFiles.length > 0) {
        setError('Tipo de arquivo não permitido.');
        return;
      }

      const queue = selectedFiles.slice(0, remainingSlots);

      if (selectedFiles.length > remainingSlots) {
        setError(`Você pode manter no máximo ${maxFiles} arquivos.`);
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

      const data =
        ((await response.json().catch(() => null)) as {
          message?: string;
          uploaded?: StorageFileRecord[];
          errors?: Array<{ fileName: string; message: string }>;
        } | null) ?? null;

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
    } catch {
      setError('Nao foi possivel realizar upload das imagens.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(fileId: string) {
    const id = String(fileId);
    setBusyDeleteIds((prev) => new Set([...prev, id]));
    setError('');
    setSuccess('');

    try {
      const nextIds = selectedIds.filter((item) => item !== id);
      await persistImageIds(nextIds, 'Imagem desvinculada com sucesso.');
    } catch {
      setError('Nao foi possivel desvincular a imagem.');
    } finally {
      setBusyDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <Card>
      {readOnly ? null : (
        <CardHeader>
          <CardDescription>
            {description ??
              `Até ${maxFiles} fotos nos formatos JPG, GIF, PNG, HEIC ou WEBP. (Tamanho máximo de ${maxFileSizeMb} MB por arquivo)`}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{success}</p>
          </div>
        ) : null}

        {readOnly ? null : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label
                htmlFor="image-gallery-upload"
                className="inline-flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando...' : 'Selecionar arquivos'}
              </label>
            </div>
            <input
              id="image-gallery-upload"
              type="file"
              accept={accept}
              multiple
              className="hidden h-4"
              onChange={(event) => {
                void handleUpload(event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Carregando imagens">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-3"
                >
                  <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && visibleItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Nenhum arquivo vinculado ainda.
            </p>
          ) : null}

          {!loading && visibleItems.length > 0 ? (
            <div className="space-y-2">
              {visibleItems.map((item, index) => {
                const deleting = busyDeleteIds.has(String(item.id));
                const isImage = (item.mimeType ?? '').startsWith('image/');
                const isCover = index === 0 && isImage;

                const thumb = isImage ? (
                  <Image
                    src={`/api/storage/files/${item.id}/content`}
                    alt={item.originalName}
                    width={112}
                    height={112}
                    className="h-14 w-14 object-cover"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center text-[10px] text-muted-foreground">
                    Abrir
                  </div>
                );

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-3 transition-colors hover:border-border"
                  >
                    {isImage ? (
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20"
                      >
                        {thumb}
                      </button>
                    ) : (
                      <a
                        href={`/api/storage/files/${item.id}/content`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/20"
                      >
                        {thumb}
                      </a>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.originalName}
                        </p>
                        {isCover ? (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Capa
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatBytes(item.sizeBytes)}
                      </p>
                    </div>

                    {readOnly ? null : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          void handleRemove(String(item.id));
                        }}
                        disabled={deleting}
                        aria-label={`Desvincular ${item.originalName}`}
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </CardContent>

      {previewItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute right-2 top-2 rounded-md bg-black/60 p-2 text-white hover:bg-black/80"
              aria-label="Fechar visualizacao"
            >
              <X className="h-4 w-4" />
            </button>

            <Image
              src={`/api/storage/files/${previewItem.id}/content`}
              alt={previewItem.originalName}
              width={1600}
              height={1200}
              className="max-h-[85vh] w-full rounded-md object-contain"
              unoptimized
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}
