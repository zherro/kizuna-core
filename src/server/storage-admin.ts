import { getSession } from './auth';
import { isOptimizableImage, optimizeImageWithThumbnail, presetForPurpose } from './image';
import { readImageDimensions } from './image-dimensions';
import { serviceDb, ServiceUnavailableError, type ServiceDb } from './service-db';

/**
 * Storage do root (`/painel/root/storage`): lista as imagens de `public.files` e reotimiza as que
 * já existem no próprio registro (mesmo `id` — nenhuma referência muda), com o mesmo otimizador do
 * upload: imagem grande pelo preset do `purpose` + miniatura (`thumb_*`, migration storage/0005).
 *
 * Lê e grava como `service_role` (storage/0006): o root reotimiza arquivos de qualquer dono, o que
 * a policy de UPDATE (só o dono) não deixaria pela sessão. O gate `is_root` fica no handler.
 *
 * Import por `@kizuna/core/server/storage-admin` (carrega sharp — fora do `@kizuna/core/server`).
 */

export type StorageImageStatus = 'pending' | 'optimized' | 'all';

export type StorageAdminImage = {
  id: string;
  originalName: string;
  purpose: string;
  mimeType: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  thumbSizeBytes: number | null;
  thumbWidth: number | null;
  thumbHeight: number | null;
  optimizedAt: string | null;
  createdAt: string | null;
};

export type ReoptimizeResult = {
  id: string;
  status: 'optimized' | 'skipped' | 'failed';
  beforeBytes: number;
  afterBytes: number;
  message?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PURPOSE_RE = /^[a-z_]+$/;
const LIST_COLUMNS =
  'id,original_name,purpose,mime_type,size_bytes,width,height,thumb_size_bytes,thumb_width,thumb_height,optimized_at,created_at';

/** Máximo de imagens por chamada de reotimização — a tela manda em lotes e mostra o progresso. */
export const REOPTIMIZE_BATCH_MAX = 10;

function toPgBytea(buffer: Buffer) {
  return `\\x${buffer.toString('hex')}`;
}

function fromPgBytea(value: unknown): Buffer | null {
  if (typeof value !== 'string' || !value.startsWith('\\x')) return null;
  const hex = value.slice(2);
  if (!hex || hex.length % 2 !== 0) return null;
  return Buffer.from(hex, 'hex');
}

function num(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function mapImage(row: Record<string, unknown>): StorageAdminImage {
  return {
    id: String(row.id ?? ''),
    originalName: String(row.original_name ?? ''),
    purpose: String(row.purpose ?? 'other'),
    mimeType: row.mime_type ? String(row.mime_type) : null,
    sizeBytes: Number(row.size_bytes ?? 0),
    width: num(row.width),
    height: num(row.height),
    thumbSizeBytes: num(row.thumb_size_bytes),
    thumbWidth: num(row.thumb_width),
    thumbHeight: num(row.thumb_height),
    optimizedAt: row.optimized_at ? String(row.optimized_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  };
}

/** Total do header `Content-Range: 0-49/123` (`Prefer: count=exact`). */
function totalFrom(response: Response): number {
  const range = response.headers.get('content-range') ?? '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

export async function listStorageImages(
  args: { status?: StorageImageStatus; purpose?: string; limit?: number; offset?: number },
  db: ServiceDb = serviceDb
): Promise<{ items: StorageAdminImage[]; total: number }> {
  const query = new URLSearchParams({
    select: LIST_COLUMNS,
    active: 'eq.true',
    mime_type: 'like.image/*',
    order: 'created_at.desc',
    limit: String(Math.max(1, Math.min(args.limit ?? 30, 100))),
    offset: String(Math.max(0, args.offset ?? 0)),
  });
  if (args.status === 'pending') query.set('optimized_at', 'is.null');
  if (args.status === 'optimized') query.set('optimized_at', 'not.is.null');
  if (args.purpose && PURPOSE_RE.test(args.purpose)) query.set('purpose', `eq.${args.purpose}`);

  const response = await db.table(`/files?${query.toString()}`, {
    headers: { Prefer: 'count=exact' },
  });
  if (!response.ok) throw new Error('Não foi possível listar as imagens.');
  const rows = ((await response.json().catch(() => [])) ?? []) as Array<Record<string, unknown>>;
  return { items: rows.map(mapImage), total: totalFrom(response) };
}

/**
 * Reotimiza uma imagem no próprio registro. Regrava a versão grande só se ela ficar menor (ou com
 * menos pixels — foto acima do preset); senão mantém o arquivo como está e só grava a miniatura.
 * Marca `optimized_at` nos dois casos, pra sair da lista de pendentes.
 */
export async function reoptimizeStoredImage(
  id: string,
  db: ServiceDb = serviceDb
): Promise<ReoptimizeResult> {
  const fail = (message: string, beforeBytes = 0): ReoptimizeResult => ({
    id,
    status: 'failed',
    beforeBytes,
    afterBytes: beforeBytes,
    message,
  });
  if (!UUID_RE.test(id)) return fail('ID inválido.');

  const response = await db.table(
    `/files?select=id,original_name,purpose,mime_type,size_bytes,width,height,content&id=eq.${id}&limit=1`
  );
  if (!response.ok) return fail('Não foi possível ler o arquivo.');
  const row = (((await response.json().catch(() => [])) ?? []) as Array<Record<string, unknown>>)[0];
  if (!row) return fail('Arquivo não encontrado.');

  const original = fromPgBytea(row.content);
  const mimeType = row.mime_type ? String(row.mime_type).toLowerCase() : null;
  const beforeBytes = original?.length ?? Number(row.size_bytes ?? 0);
  if (!original) return fail('Arquivo sem conteúdo.', beforeBytes);
  if (!isOptimizableImage(mimeType)) {
    return { id, status: 'skipped', beforeBytes, afterBytes: beforeBytes, message: 'Formato não suportado.' };
  }

  const optimized = await optimizeImageWithThumbnail(
    original,
    mimeType,
    presetForPurpose(String(row.purpose ?? ''))
  );
  if (!optimized.image.optimized) return fail('Não foi possível otimizar a imagem.', beforeBytes);

  const originalDims =
    num(row.width) && num(row.height)
      ? { width: Number(row.width), height: Number(row.height) }
      : readImageDimensions(original, mimeType ?? '');
  const newPixels = (optimized.image.width ?? 0) * (optimized.image.height ?? 0);
  const oldPixels = originalDims ? originalDims.width * originalDims.height : Infinity;
  const useNew = optimized.image.buffer.length < original.length || newPixels < oldPixels;

  const originalName = String(row.original_name ?? `file-${id}`);
  const patch: Record<string, unknown> = {
    thumb_content: optimized.thumb ? toPgBytea(optimized.thumb.buffer) : null,
    thumb_size_bytes: optimized.thumb?.buffer.length ?? null,
    thumb_width: optimized.thumb?.width ?? null,
    thumb_height: optimized.thumb?.height ?? null,
    optimized_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (useNew) {
    Object.assign(patch, {
      content: toPgBytea(optimized.image.buffer),
      mime_type: optimized.image.mimeType,
      size_bytes: optimized.image.buffer.length,
      width: optimized.image.width,
      height: optimized.image.height,
      original_name: originalName.replace(/\.[^.]+$/, '') + '.webp',
    });
  } else if (originalDims && (num(row.width) == null || num(row.height) == null)) {
    Object.assign(patch, { width: originalDims.width, height: originalDims.height });
  }

  const update = await db.table(`/files?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!update.ok) return fail('Não foi possível salvar a imagem otimizada.', beforeBytes);

  return {
    id,
    status: 'optimized',
    beforeBytes,
    afterBytes: useNew ? optimized.image.buffer.length : beforeBytes,
  };
}

async function requireRoot(): Promise<Response | null> {
  const session = await getSession();
  if (!session?.is_root) return Response.json({ message: 'Acesso só para root.' }, { status: 403 });
  return null;
}

function serviceError(error: unknown): Response {
  if (error instanceof ServiceUnavailableError) {
    return Response.json({ message: error.message }, { status: 503 });
  }
  console.error('[storage-admin]', error instanceof Error ? error.message : error);
  return Response.json({ message: 'Falha ao acessar o storage.' }, { status: 500 });
}

/**
 * Rotas da tela de storage do root. Um projeto liga em `src/app/api/storage/admin/route.ts`:
 * `const h = createStorageAdminHandlers(); export const GET = h.GET; export const POST = h.POST;`
 *
 * - `GET ?status=pending|optimized|all&purpose=&limit=&offset=` → `{ items, total }`
 * - `POST { ids: string[] }` (até `REOPTIMIZE_BATCH_MAX`) → `{ results: ReoptimizeResult[] }`
 */
export function createStorageAdminHandlers(db: ServiceDb = serviceDb) {
  async function GET(request: Request): Promise<Response> {
    const denied = await requireRoot();
    if (denied) return denied;
    const params = new URL(request.url).searchParams;
    const status = params.get('status');
    try {
      const result = await listStorageImages(
        {
          status: status === 'pending' || status === 'optimized' ? status : 'all',
          purpose: params.get('purpose') ?? undefined,
          limit: Number(params.get('limit') ?? 30),
          offset: Number(params.get('offset') ?? 0),
        },
        db
      );
      return Response.json(result);
    } catch (error) {
      return serviceError(error);
    }
  }

  async function POST(request: Request): Promise<Response> {
    const denied = await requireRoot();
    if (denied) return denied;
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((value) => String(value)).filter((value) => UUID_RE.test(value))
      : [];
    if (ids.length === 0) return Response.json({ message: 'Informe as imagens.' }, { status: 400 });
    if (ids.length > REOPTIMIZE_BATCH_MAX) {
      return Response.json(
        { message: `No máximo ${REOPTIMIZE_BATCH_MAX} imagens por vez.` },
        { status: 400 }
      );
    }
    try {
      const results: ReoptimizeResult[] = [];
      // Uma por vez: cada imagem é CPU (sharp) + bytea grande indo e voltando do banco.
      for (const id of ids) results.push(await reoptimizeStoredImage(id, db));
      return Response.json({ results });
    } catch (error) {
      return serviceError(error);
    }
  }

  return { GET, POST };
}
