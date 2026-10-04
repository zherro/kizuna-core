import { randomUUID } from 'node:crypto';
import { optimizeImageWithThumbnail, presetForPurpose } from './image';
import { readImageDimensions } from './image-dimensions';
import { pgrstTable } from './postrest/conn';

export type StorageFileRecord = {
  id: string;
  uid?: string;
  originalName: string;
  storagePath: string;
  publicUrl: string | null;
  mimeType: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  /** Tem miniatura (`/content?size=thumb`)? Sem ela a rota devolve a imagem grande. */
  hasThumb: boolean;
  purpose: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

/** Versão do conteúdo: `full` (padrão) ou `thumb` — sem miniatura gravada, cai na `full`. */
export type FileContentSize = 'full' | 'thumb';

/** `?size=thumb` na URL da rota de conteúdo → `thumb`; qualquer outra coisa → `full`. */
export function fileContentSizeFromRequest(request: Request): FileContentSize {
  return new URL(request.url).searchParams.get('size') === 'thumb' ? 'thumb' : 'full';
}

export type UploadFileInput = {
  file: File;
  purpose: string;
  optimizeImages: boolean;
  maxFileSizeBytes: number;
};

export type StorageService = {
  listFiles: (args: {
    authHeader: string;
    ids?: string[];
    purpose?: string;
    active?: boolean;
    limit?: number;
  }) => Promise<StorageFileRecord[]>;
  uploadFiles: (args: { authHeader: string; files: UploadFileInput[] }) => Promise<{
    uploaded: StorageFileRecord[];
    errors: Array<{ fileName: string; message: string }>;
  }>;
  deleteFile: (args: { authHeader: string; id: string }) => Promise<boolean>;
  getFileContent: (args: {
    authHeader: string;
    id: string;
    activeOnly?: boolean;
    size?: FileContentSize;
  }) => Promise<{
    mimeType: string;
    originalName: string;
    content: Buffer;
  } | null>;
};

type ProviderMode = 'postgres';

const ALLOWED_PURPOSES = new Set([
  'ad_image',
  'service_image',
  'demanda_attachment',
  'ticket_attachment',
  'avatar',
  'document',
  'banner',
  'pdf',
  'doc',
  'other',
]);
const IMAGE_MIME_PREFIX = 'image/';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PgErrorPayload = {
  message?: string;
  details?: string;
  hint?: string;
  error?: string;
  code?: string;
};

function getProviderMode(): ProviderMode {
  const value = String(process.env.STORAGE_PROVIDER ?? 'postgres')
    .trim()
    .toLowerCase();
  if (value === 'postgres') return 'postgres';
  return 'postgres';
}

function sanitizePurpose(value: string) {
  const normalized = value.trim().toLowerCase();
  if (ALLOWED_PURPOSES.has(normalized)) return normalized;
  return 'other';
}

function toPgBytea(buffer: Buffer) {
  return `\\x${buffer.toString('hex')}`;
}

function fromPgBytea(value: unknown): Buffer | null {
  if (typeof value !== 'string' || !value.startsWith('\\x')) return null;
  const hex = value.slice(2);
  if (!hex || hex.length % 2 !== 0) return null;
  return Buffer.from(hex, 'hex');
}

function sanitizeFileName(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'arquivo'
  );
}

function makeStoragePath(purpose: string, originalName: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeName = sanitizeFileName(originalName);
  return `${purpose}/${year}/${month}/${randomUUID()}-${safeName}`;
}

function parsePgErrorMessage(payload: unknown, fallback: string) {
  const pg = (payload as PgErrorPayload | null) ?? null;
  const base = pg?.message?.trim() || fallback;
  const details = pg?.details?.trim() || pg?.hint?.trim() || pg?.error?.trim() || '';
  if (!details) return base;
  return `${base} (${details})`;
}

function mapFileRecord(input: Record<string, unknown>): StorageFileRecord {
  return {
    id: String(input.id ?? ''),
    uid: typeof input.uid === 'string' ? input.uid : undefined,
    originalName: String(input.original_name ?? ''),
    storagePath: String(input.storage_path ?? ''),
    publicUrl: input.public_url ? String(input.public_url) : null,
    mimeType: input.mime_type ? String(input.mime_type) : null,
    sizeBytes: Number(input.size_bytes ?? 0),
    width: input.width === null || input.width === undefined ? null : Number(input.width),
    height: input.height === null || input.height === undefined ? null : Number(input.height),
    hasThumb: input.thumb_width !== null && input.thumb_width !== undefined,
    purpose: String(input.purpose ?? 'other'),
    active: Boolean(input.active ?? true),
    createdAt: input.created_at ? String(input.created_at) : null,
    updatedAt: input.updated_at ? String(input.updated_at) : null,
  };
}

async function listFilesPostgres(args: {
  authHeader: string;
  ids?: string[];
  purpose?: string;
  active?: boolean;
  limit?: number;
}) {
  const query = new URLSearchParams({
    select:
      'id,uid,original_name,storage_path,public_url,mime_type,size_bytes,width,height,thumb_width,purpose,active,created_at,updated_at',
    order: 'created_at.desc',
    limit: String(Math.max(1, Math.min(args.limit ?? 100, 200))),
  });

  if (args.ids && args.ids.length > 0) {
    // `files.id` is a uuid (see plugins/storage/0001_storage.sql), not a numeric id.
    const ids = args.ids
      .map((value) => String(value).trim())
      .filter((value) => UUID_RE.test(value));

    if (ids.length > 0) {
      query.set('id', `in.(${ids.join(',')})`);
    }
  }

  if (args.purpose) {
    query.set('purpose', `eq.${sanitizePurpose(args.purpose)}`);
  }

  if (typeof args.active === 'boolean') {
    query.set('active', `eq.${args.active}`);
  }

  const response = await pgrstTable(
    `/files?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        'Accept-Profile': 'public',
      },
    },
    { auth: args.authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(parsePgErrorMessage(payload, 'Nao foi possivel listar os arquivos.'));
  }

  const rows = (Array.isArray(payload) ? payload : []) as Array<Record<string, unknown>>;

  return rows.map(mapFileRecord);
}

async function uploadSingleFilePostgres(args: {
  authHeader: string;
  input: UploadFileInput;
}): Promise<StorageFileRecord> {
  const file = args.input.file;
  const purpose = sanitizePurpose(args.input.purpose);
  const mimeType = file.type?.trim().toLowerCase() || null;

  if (file.size <= 0) {
    throw new Error('Arquivo invalido: tamanho zero.');
  }

  if (file.size > args.input.maxFileSizeBytes) {
    throw new Error('Arquivo excede o limite maximo permitido.');
  }

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  let finalBuffer: Buffer = originalBuffer;
  let finalMime = mimeType;
  let finalName = file.name;
  let dimensions: { width: number; height: number } | null = null;
  let thumb: { buffer: Buffer; width: number | null; height: number | null } | null = null;

  // Imagem: sharp no próprio servidor (redimensiona por `purpose`, converte para WebP) + miniatura.
  if (args.input.optimizeImages && mimeType && mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    const optimized = await optimizeImageWithThumbnail(
      originalBuffer,
      mimeType,
      presetForPurpose(purpose)
    );
    if (optimized.image.optimized) {
      finalBuffer = optimized.image.buffer;
      finalMime = optimized.image.mimeType;
      finalName = file.name.replace(/\.[^.]+$/, '') + '.webp';
      if (optimized.image.width && optimized.image.height) {
        dimensions = { width: optimized.image.width, height: optimized.image.height };
      }
    }
    if (optimized.thumb) {
      thumb = {
        buffer: optimized.thumb.buffer,
        width: optimized.thumb.width,
        height: optimized.thumb.height,
      };
    }
  }

  const storagePath = makeStoragePath(purpose, finalName);

  // Sem otimização, as dimensões vêm do cabeçalho do arquivo original.
  if (!dimensions && mimeType && mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    dimensions = readImageDimensions(originalBuffer, mimeType);
  }

  const payload = {
    original_name: finalName,
    storage_path: storagePath,
    public_url: null,
    mime_type: finalMime,
    size_bytes: finalBuffer.length,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    content: toPgBytea(finalBuffer),
    thumb_content: thumb ? toPgBytea(thumb.buffer) : null,
    thumb_size_bytes: thumb ? thumb.buffer.length : null,
    thumb_width: thumb?.width ?? null,
    thumb_height: thumb?.height ?? null,
    purpose,
    active: true,
  };

  const response = await pgrstTable(
    '/files?select=id,uid,original_name,storage_path,public_url,mime_type,size_bytes,width,height,thumb_width,purpose,active,created_at,updated_at',
    {
      method: 'POST',
      headers: {
        'Accept-Profile': 'public',
        'Content-Profile': 'public',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    },
    { auth: args.authHeader }
  );

  const responsePayload = (await response.json().catch(() => null)) as unknown;
  const rows = (Array.isArray(responsePayload) ? responsePayload : []) as Array<
    Record<string, unknown>
  >;

  if (!response.ok || !rows[0]) {
    throw new Error(parsePgErrorMessage(responsePayload, 'Nao foi possivel salvar o arquivo.'));
  }

  return mapFileRecord(rows[0]);
}

async function uploadFilesPostgres(args: { authHeader: string; files: UploadFileInput[] }) {
  const uploaded: StorageFileRecord[] = [];
  const errors: Array<{ fileName: string; message: string }> = [];

  for (const input of args.files) {
    try {
      const item = await uploadSingleFilePostgres({ authHeader: args.authHeader, input });
      uploaded.push(item);
    } catch (error) {
      errors.push({
        fileName: input.file.name,
        message: error instanceof Error ? error.message : 'Falha no upload do arquivo.',
      });
    }
  }

  return { uploaded, errors };
}

async function deleteFilePostgres(args: { authHeader: string; id: string }) {
  const cleanId = String(args.id ?? '').trim();
  if (!UUID_RE.test(cleanId)) {
    return false;
  }

  const response = await pgrstTable(
    `/files?id=eq.${cleanId}&select=id`,
    {
      method: 'PATCH',
      headers: {
        'Accept-Profile': 'public',
        'Content-Profile': 'public',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ active: false }),
    },
    { auth: args.authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  const rows = (Array.isArray(payload) ? payload : []) as Array<Record<string, unknown>>;
  if (!response.ok) return false;
  return Boolean(rows[0]?.id);
}

async function fetchFileColumn(args: {
  authHeader: string;
  id: string;
  activeOnly: boolean;
  column: 'content' | 'thumb_content';
}) {
  const query = new URLSearchParams({
    select: `id,original_name,mime_type,${args.column},active`,
    id: `eq.${args.id}`,
    limit: '1',
  });

  if (args.activeOnly) {
    query.set('active', 'eq.true');
  }

  const response = await pgrstTable(
    `/files?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        'Accept-Profile': 'public',
      },
    },
    { auth: args.authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(
      parsePgErrorMessage(payload, 'Nao foi possivel carregar o conteudo do arquivo.')
    );
  }

  const rows = (Array.isArray(payload) ? payload : []) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

async function getFileContentPostgres(args: {
  authHeader: string;
  id: string;
  activeOnly?: boolean;
  size?: FileContentSize;
}) {
  const cleanId = String(args.id ?? '').trim();
  if (!UUID_RE.test(cleanId)) {
    return null;
  }
  const activeOnly = args.activeOnly ?? true;

  // Miniatura primeiro (só a coluna dela, pra não trafegar a imagem grande junto); sem miniatura,
  // cai na versão grande.
  if (args.size === 'thumb') {
    const row = await fetchFileColumn({
      authHeader: args.authHeader,
      id: cleanId,
      activeOnly,
      column: 'thumb_content',
    });
    if (!row) return null;
    const thumb = fromPgBytea(row.thumb_content);
    if (thumb) {
      return {
        mimeType: 'image/webp',
        originalName: String(row.original_name ?? `file-${cleanId}`),
        content: thumb,
      };
    }
  }

  const found = await fetchFileColumn({
    authHeader: args.authHeader,
    id: cleanId,
    activeOnly,
    column: 'content',
  });
  if (!found) return null;

  const content = fromPgBytea(found.content);
  if (!content) return null;

  return {
    mimeType: String(found.mime_type ?? 'application/octet-stream'),
    originalName: String(found.original_name ?? `file-${cleanId}`),
    content,
  };
}

class PostgresStorageService implements StorageService {
  async listFiles(args: {
    authHeader: string;
    ids?: string[];
    purpose?: string;
    active?: boolean;
    limit?: number;
  }) {
    return listFilesPostgres(args);
  }

  async uploadFiles(args: { authHeader: string; files: UploadFileInput[] }) {
    return uploadFilesPostgres(args);
  }

  async deleteFile(args: { authHeader: string; id: string }) {
    return deleteFilePostgres(args);
  }

  async getFileContent(args: {
    authHeader: string;
    id: string;
    activeOnly?: boolean;
    size?: FileContentSize;
  }) {
    return getFileContentPostgres(args);
  }
}

export function getStorageService(): StorageService {
  const provider = getProviderMode();

  if (provider === 'postgres') {
    return new PostgresStorageService();
  }

  return new PostgresStorageService();
}
