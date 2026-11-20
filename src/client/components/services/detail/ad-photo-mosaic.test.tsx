import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdPhotoMosaic } from './ad-photo-mosaic';

const imgs = (html: string) => html.match(/<img[^>]*>/g) ?? [];

describe('AdPhotoMosaic', () => {
  it('1ª foto (LCP) com prioridade alta e sem lazy; a 2ª lazy e assíncrona', () => {
    const html = renderToStaticMarkup(
      <AdPhotoMosaic photos={['/a.webp', '/b.webp', '/c.webp']} alt="Show" />
    );
    const [first, second] = imgs(html);
    expect(imgs(html)).toHaveLength(2);
    expect(first).toContain('src="/a.webp"');
    expect(first).toMatch(/fetchpriority="high"/i);
    expect(first).not.toContain('loading=');
    expect(second).toContain('src="/b.webp"');
    expect(second).toContain('loading="lazy"');
    expect(second).toContain('decoding="async"');
    expect(second).not.toMatch(/fetchpriority/i);
    expect(html).toContain('+1');
  });

  it('sem fotos mostra o placeholder e não renderiza <img>', () => {
    const html = renderToStaticMarkup(<AdPhotoMosaic photos={[]} alt="Show" />);
    expect(imgs(html)).toHaveLength(0);
    expect(html).toContain('Sem fotos');
  });
});
