import tinify from 'tinify';

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type OptimizeImageOptions = {
  input: Buffer;
  mimeType?: string | null;
  strict?: boolean;
};

type OptimizeImageResult = {
  buffer: Buffer;
  optimized: boolean;
  reason?: 'missing-api-key' | 'unsupported-format' | 'tinify-error';
};

function getTinyPngKey(): string | null {
  return process.env.TINYPNG_API_KEY || process.env.TINIFY_API_KEY || null;
}

function normalizeMimeType(value?: string | null) {
  if (!value) return null;
  return value.trim().toLowerCase();
}

export async function optimizeImageBuffer(
  options: OptimizeImageOptions
): Promise<OptimizeImageResult> {
  const mimeType = normalizeMimeType(options.mimeType);
  const strict = options.strict ?? false;

  if (options.input.length === 0) {
    throw new Error('Imagem inválida: buffer vazio.');
  }

  if (!mimeType || !SUPPORTED_MIME_TYPES.has(mimeType)) {
    if (strict) {
      throw new Error('Formato de imagem não suportado pelo TinyPNG. Use JPEG, PNG ou WebP.');
    }
    return { buffer: options.input, optimized: false, reason: 'unsupported-format' };
  }

  const key = getTinyPngKey();
  if (!key) {
    if (strict) {
      throw new Error('TINYPNG_API_KEY/TINIFY_API_KEY não configurada no servidor.');
    }
    return { buffer: options.input, optimized: false, reason: 'missing-api-key' };
  }

  try {
    tinify.key = key;
    const source = tinify.fromBuffer(options.input);
    const output: any = await source.toBuffer();

    return { buffer: output, optimized: true };
  } catch {
    if (strict) {
      throw new Error('Falha ao otimizar imagem com TinyPNG.');
    }
    return { buffer: options.input, optimized: false, reason: 'tinify-error' };
  }
}
