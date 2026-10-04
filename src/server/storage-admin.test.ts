import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./auth', () => ({ getSession: vi.fn(), getServiceAuthHeader: () => 'Bearer test' }));

import { getSession } from './auth';
import { createStorageAdminHandlers, reoptimizeStoredImage } from './storage-admin';
import type { ServiceDb } from './service-db';

const ID = '11111111-2222-3333-4444-555555555555';

async function jpeg(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 30 } },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/** `ServiceDb` em memória: um GET devolve a linha, um PATCH guarda o corpo. */
function fakeDb(row: Record<string, unknown>) {
  const patches: Array<Record<string, unknown>> = [];
  const table = vi.fn(async (path: string, init: RequestInit & { schema?: string } = {}) => {
    if (init.method === 'PATCH') {
      patches.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 204 });
    }
    return Response.json([row], { headers: { 'content-range': '0-0/1' } });
  });
  const db = { table, rpc: vi.fn() } as unknown as ServiceDb;
  return { db, table, patches };
}

describe('reoptimizeStoredImage', () => {
  it('regrava a foto grande em WebP no preset do purpose e gera a miniatura', async () => {
    const original = await jpeg(4000, 3000);
    const { db, patches } = fakeDb({
      id: ID,
      original_name: 'foto.jpg',
      purpose: 'service_image',
      mime_type: 'image/jpeg',
      size_bytes: original.length,
      width: 4000,
      height: 3000,
      content: `\\x${original.toString('hex')}`,
    });

    const result = await reoptimizeStoredImage(ID, db);

    expect(result.status).toBe('optimized');
    expect(result.afterBytes).toBeLessThan(result.beforeBytes);
    const patch = patches[0];
    expect(patch).toMatchObject({
      mime_type: 'image/webp',
      width: 1600,
      height: 1200,
      original_name: 'foto.webp',
      thumb_width: 640,
      thumb_height: 480,
    });
    expect(patch.optimized_at).toEqual(expect.any(String));
  });

  it('pôster em pé: miniatura 427×640, sem cortar', async () => {
    const original = await jpeg(1000, 1500);
    const { db, patches } = fakeDb({
      id: ID,
      original_name: 'poster.jpg',
      purpose: 'service_image',
      mime_type: 'image/jpeg',
      size_bytes: original.length,
      width: null,
      height: null,
      content: `\\x${original.toString('hex')}`,
    });

    await reoptimizeStoredImage(ID, db);

    expect(patches[0]).toMatchObject({ thumb_width: 427, thumb_height: 640 });
  });

  it('imagem pequena: sem miniatura, marca como otimizada', async () => {
    const original = await jpeg(500, 400);
    const { db, patches } = fakeDb({
      id: ID,
      original_name: 'mini.jpg',
      purpose: 'service_image',
      mime_type: 'image/jpeg',
      size_bytes: original.length,
      width: 500,
      height: 400,
      content: `\\x${original.toString('hex')}`,
    });

    const result = await reoptimizeStoredImage(ID, db);

    expect(result.status).toBe('optimized');
    expect(patches[0]).toMatchObject({ thumb_content: null, thumb_width: null });
    expect(patches[0].optimized_at).toEqual(expect.any(String));
  });

  it('formato não suportado: pula sem gravar', async () => {
    const { db, patches } = fakeDb({
      id: ID,
      original_name: 'doc.heic',
      purpose: 'service_image',
      mime_type: 'image/heic',
      size_bytes: 3,
      content: '\\x010203',
    });

    const result = await reoptimizeStoredImage(ID, db);

    expect(result.status).toBe('skipped');
    expect(patches).toHaveLength(0);
  });
});

describe('createStorageAdminHandlers', () => {
  it('nega quem não é root', async () => {
    vi.mocked(getSession).mockResolvedValueOnce({ is_root: false } as never);
    const { db } = fakeDb({});
    const { GET } = createStorageAdminHandlers(db);

    const response = await GET(new Request('http://x/api/storage/admin'));

    expect(response.status).toBe(403);
  });

  it('lista as pendentes com o total do Content-Range', async () => {
    vi.mocked(getSession).mockResolvedValueOnce({ is_root: true } as never);
    const { db, table } = fakeDb({ id: ID, original_name: 'a.jpg', purpose: 'avatar', size_bytes: 10 });
    const { GET } = createStorageAdminHandlers(db);

    const response = await GET(new Request('http://x/api/storage/admin?status=pending'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.items[0]).toMatchObject({ id: ID, originalName: 'a.jpg', optimizedAt: null });
    expect(String(table.mock.calls[0][0])).toContain('optimized_at=is.null');
  });

  it('recusa lote acima do máximo', async () => {
    vi.mocked(getSession).mockResolvedValueOnce({ is_root: true } as never);
    const { db } = fakeDb({});
    const { POST } = createStorageAdminHandlers(db);
    const ids = Array.from({ length: 11 }, () => ID);

    const response = await POST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ ids }) })
    );

    expect(response.status).toBe(400);
  });
});
