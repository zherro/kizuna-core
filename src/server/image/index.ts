import sharp from 'sharp';
import { getSession } from '../auth';

/**
 * Otimização de imagens no próprio servidor com sharp (libvips) — grátis, sem limite e sem rede.
 * Corrige a rotação do EXIF, tira metadados (inclui GPS), redimensiona e converte para WebP.
 * Usado pelo upload (`storage-service`) e exposto como API por `createImageOptimizeHandler`.
 */

export type ImagePreset = 'avatar' | 'listing' | 'default';

type PresetConfig = { width: number; height: number; fit: 'cover' | 'inside'; quality: number };

export const IMAGE_PRESETS: Record<ImagePreset, PresetConfig> = {
  avatar: { width: 512, height: 512, fit: 'cover', quality: 80 },
  listing: { width: 1600, height: 1600, fit: 'inside', quality: 80 },
  default: { width: 2048, height: 2048, fit: 'inside', quality: 82 },
};

const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

export type OptimizedImage = {
  buffer: Buffer;
  mimeType: string;
  width: number | null;
  height: number | null;
  optimized: boolean;
};

export function isOptimizableImage(mimeType?: string | null): boolean {
  return !!mimeType && SUPPORTED.has(mimeType.toLowerCase());
}

/** `purpose` do upload → preset (avatar → avatar; foto de anúncio → listing; resto → default). */
export function presetForPurpose(purpose?: string | null): ImagePreset {
  if (purpose === 'avatar') return 'avatar';
  if (purpose === 'ad_image' || purpose === 'listing') return 'listing';
  return 'default';
}

/** Otimiza; se o formato não for suportado ou o sharp falhar, devolve o original intacto. */
export async function optimizeImage(
  input: Buffer,
  mimeType: string | null,
  preset: ImagePreset = 'default'
): Promise<OptimizedImage> {
  const original: OptimizedImage = {
    buffer: input,
    mimeType: mimeType ?? 'application/octet-stream',
    width: null,
    height: null,
    optimized: false,
  };
  if (!isOptimizableImage(mimeType)) return original;

  const cfg = IMAGE_PRESETS[preset];
  try {
    const { data, info } = await sharp(input, { animated: false })
      .rotate()
      .resize(cfg.width, cfg.height, { fit: cfg.fit, withoutEnlargement: cfg.fit === 'inside' })
      .webp({ quality: cfg.quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, mimeType: 'image/webp', width: info.width, height: info.height, optimized: true };
  } catch (error) {
    console.error('[image] optimize_failed', error instanceof Error ? error.message : error);
    return original;
  }
}

/**
 * `POST` multipart `{ file, preset? }` → a imagem otimizada (WebP) no corpo da resposta.
 * Um projeto liga em `src/app/api/images/optimize/route.ts`:
 * `export const POST = createImageOptimizeHandler({ maxFileSizeMb: 20 })`.
 */
export function createImageOptimizeHandler(
  options: { maxFileSizeMb?: number; requireAuth?: boolean } = {}
) {
  const maxBytes = (options.maxFileSizeMb ?? 20) * 1024 * 1024;
  const requireAuth = options.requireAuth ?? true;
  return async function POST(request: Request): Promise<Response> {
    // Processar imagem custa CPU: por padrão só para quem está logado.
    if (requireAuth && !(await getSession())) {
      return Response.json({ message: 'Entre na sua conta.' }, { status: 401 });
    }
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
      return Response.json({ message: 'Envie a imagem no campo "file".' }, { status: 400 });
    }
    if (file.size > maxBytes) {
      return Response.json({ message: 'Imagem acima do limite.' }, { status: 413 });
    }
    if (!isOptimizableImage(file.type)) {
      return Response.json({ message: 'Use JPEG, PNG, WebP, AVIF ou GIF.' }, { status: 415 });
    }
    const presetRaw = String(form?.get('preset') ?? 'default');
    const preset = (presetRaw in IMAGE_PRESETS ? presetRaw : 'default') as ImagePreset;
    const out = await optimizeImage(Buffer.from(await file.arrayBuffer()), file.type, preset);
    return new Response(new Uint8Array(out.buffer), {
      headers: {
        'Content-Type': out.mimeType,
        'X-Image-Width': String(out.width ?? ''),
        'X-Image-Height': String(out.height ?? ''),
        'X-Image-Original-Bytes': String(file.size),
      },
    });
  };
}
