import { randomUUID } from 'node:crypto';
import { optimizeImageBuffer } from './image-optimizer';
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
  purpose: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

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
  getFileContent: (args: { authHeader: string; id: string; activeOnly?: boolean }) => Promise<{
    mimeType: string;
    originalName: string;
    content: Buffer;
  } | null>;
};

type ProviderMode = 'postgres';

const ALLOWED_PURPOSES = new Set([
  'ad_image',
  'avatar',
  'document',
  'banner',
  'pdf',
  'doc',
  'other',
]);
const IMAGE_MIME_PREFIX = 'image/';

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
      'id,uid,original_name,storage_path,public_url,mime_type,size_bytes,width,height,purpose,active,created_at,updated_at',
    order: 'created_at.desc',
    limit: String(Math.max(1, Math.min(args.limit ?? 100, 200))),
  });

  if (args.ids && args.ids.length > 0) {
    const ids = args.ids
      .map((value) => String(value).trim())
      .filter((value) => /^\d+$/.test(value));

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
  let finalBuffer: any = originalBuffer;

  if (args.input.optimizeImages && mimeType && mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    const optimized = await optimizeImageBuffer({
      input: originalBuffer,
      mimeType,
      strict: false,
    });
    finalBuffer = optimized.buffer;
  }

  const storagePath = makeStoragePath(purpose, file.name);

  const payload = {
    original_name: file.name,
    storage_path: storagePath,
    public_url: null,
    mime_type: mimeType,
    size_bytes: finalBuffer.length,
    width: null,
    height: null,
    content: toPgBytea(finalBuffer),
    purpose,
    active: true,
  };

  const response = await pgrstTable(
    '/files?select=id,uid,original_name,storage_path,public_url,mime_type,size_bytes,width,height,purpose,active,created_at,updated_at',
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
  if (!/^\d+$/.test(cleanId)) {
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

async function getFileContentPostgres(args: {
  authHeader: string;
  id: string;
  activeOnly?: boolean;
}) {
  const cleanId = String(args.id ?? '').trim();
  if (!/^\d+$/.test(cleanId)) {
    return null;
  }

  const query = new URLSearchParams({
    select: 'id,original_name,mime_type,content,active',
    id: `eq.${cleanId}`,
    limit: '1',
  });

  if (args.activeOnly ?? true) {
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
  const found = rows[0];
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

  async getFileContent(args: { authHeader: string; id: string; activeOnly?: boolean }) {
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
