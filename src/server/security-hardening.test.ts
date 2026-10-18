import { describe, expect, it } from 'vitest';
import { checkKizunaEnv, isWeakJwtSecret } from '../lib/env-guard';
import { sanitizeReturnTo } from './app-url';
import { jsonLdScript } from './seo/build';
import { isBlockedUpload, storageContentHeaders } from './storage-service';

describe('jsonLdScript', () => {
  it('não deixa um título fechar a tag <script>', () => {
    const out = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(JSON.parse(out)).toEqual({ name: '</script><img src=x onerror=alert(1)>' });
  });
});

describe('segredo JWT', () => {
  const strong = 'a'.repeat(16) + 'b'.repeat(16);

  it('curto ou do exemplo é fraco', () => {
    expect(isWeakJwtSecret('curto')).toBe(true);
    expect(isWeakJwtSecret('this_is_a_super_secret_key_1234567890')).toBe(true);
    expect(isWeakJwtSecret(strong)).toBe(false);
  });

  it('produção não sobe com segredo fraco; dev sobe', () => {
    const base = { POSTGREST_URL: 'http://x', PGRST_JWT_SECRET: 'curto' };
    expect(checkKizunaEnv({ ...base, NODE_ENV: 'production' } as NodeJS.ProcessEnv).ok).toBe(false);
    expect(checkKizunaEnv({ ...base, NODE_ENV: 'development' } as NodeJS.ProcessEnv).ok).toBe(true);
    expect(
      checkKizunaEnv({ ...base, PGRST_JWT_SECRET: strong, NODE_ENV: 'production' } as NodeJS.ProcessEnv).ok
    ).toBe(true);
  });
});

describe('storage', () => {
  it('recusa upload de HTML, SVG e JS', () => {
    expect(isBlockedUpload('text/html', 'a.html')).toBe(true);
    expect(isBlockedUpload('image/svg+xml', 'a.svg')).toBe(true);
    expect(isBlockedUpload('image/png', 'truque.svg')).toBe(true);
    expect(isBlockedUpload('image/png', 'foto.png')).toBe(false);
    expect(isBlockedUpload('application/pdf', 'doc.pdf')).toBe(false);
  });

  it('só imagem raster abre inline; o resto baixa, sempre com sandbox', () => {
    expect(storageContentHeaders('image/webp', 'a.webp')['Content-Disposition']).toMatch(/^inline;/);
    const html = storageContentHeaders('text/html', 'x.html');
    expect(html['Content-Disposition']).toMatch(/^attachment;/);
    expect(html['Content-Security-Policy']).toContain('sandbox');
    expect(html['X-Content-Type-Options']).toBe('nosniff');
  });

  it('codifica o nome do arquivo', () => {
    const h = storageContentHeaders('image/png', 'ação "x".png')['Content-Disposition'];
    expect(h).not.toContain('"x"');
    expect(h).toContain("filename*=UTF-8''a%C3%A7%C3%A3o%20%22x%22.png");
  });
});

describe('returnTo', () => {
  it('só aceita caminho do próprio site', () => {
    expect(sanitizeReturnTo('javascript:alert(1)', '/painel')).toBe('/painel');
    expect(sanitizeReturnTo('https://evil.example', '/painel')).toBe('/painel');
    expect(sanitizeReturnTo('//evil.example', '/painel')).toBe('/painel');
    expect(sanitizeReturnTo('/anuncio/1', '/painel')).toBe('/anuncio/1');
  });
});
