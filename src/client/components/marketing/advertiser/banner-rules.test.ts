import { describe, expect, it } from 'vitest';
import { checkBannerImage, contractableSlots, creativeKind, MAX_BANNER_BYTES, recommendedSize, validateBannerFile, validateBannerLink } from './banner-rules';

describe('banner-rules', () => {
  it('GIF vira kind gif, o resto imagem', () => {
    expect(creativeKind('image/gif')).toBe('gif');
    expect(creativeKind('image/webp')).toBe('imagem');
  });

  it('arquivo: tipo e tamanho', () => {
    expect(validateBannerFile({ type: 'image/png', size: 1000 }).ok).toBe(true);
    expect(validateBannerFile({ type: 'application/pdf', size: 1000 }).ok).toBe(false);
    expect(validateBannerFile({ type: 'image/gif', size: MAX_BANNER_BYTES + 1 }).ok).toBe(false);
  });

  it('link só http/https com domínio', () => {
    expect(validateBannerLink('https://loja.com.br/oferta').ok).toBe(true);
    expect(validateBannerLink('javascript:alert(1)').ok).toBe(false);
    expect(validateBannerLink('loja.com').ok).toBe(false);
    expect(validateBannerLink('https://').ok).toBe(false);
  });

  it('proporção do formato com tolerância de 20%', () => {
    expect(checkBannerImage('banner', { width: 1200, height: 240 }).ok).toBe(true);
    expect(checkBannerImage('banner', { width: 1000, height: 220 }).ok).toBe(true);
    expect(checkBannerImage('banner', { width: 800, height: 800 }).ok).toBe(false);
    expect(checkBannerImage('card-vertical', { width: 600, height: 900 }).ok).toBe(true);
    expect(checkBannerImage('card-vertical', { width: 1200, height: 240 }).ok).toBe(false);
    expect(checkBannerImage('faixa', { width: 0, height: 0 }).ok).toBe(false);
    expect(recommendedSize('faixa')).toBe('1600×120px');
  });

  it('só contrata slot montado, ligado e que aceita imagem/GIF', () => {
    const slots = contractableSlots([
      { slug: 'cidade-topo', enabled: true, media: ['imagem', 'google'] },
      { slug: 'home-meio', enabled: false, media: ['imagem'] },
      { slug: 'anuncio-rodape', enabled: true, media: ['google'] },
      { slug: 'descobrir-card', enabled: true, media: ['imagem'] }, // mounted: false no catálogo
    ]);
    expect(slots.map((s) => s.slug)).toEqual(['cidade-topo']);
  });
});
