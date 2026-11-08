import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { whatsappLink } from './whatsapp';
import { LandingPoints, LandingSteps } from './landing-blocks';
import { LandingHero } from './landing-hero';

describe('whatsappLink', () => {
  it('usa só os dígitos e codifica a mensagem', () => {
    expect(whatsappLink('+55 (65) 99999-0000', 'Oi! Quero anunciar meu bar.')).toBe(
      'https://wa.me/5565999990000?text=Oi!%20Quero%20anunciar%20meu%20bar.'
    );
  });

  it('sem número não gera link quebrado', () => {
    expect(whatsappLink('', 'Oi')).toBe('https://wa.me/?text=Oi');
    expect(whatsappLink(undefined, 'Oi')).toBe('https://wa.me/?text=Oi');
  });
});

describe('blocos de captação', () => {
  it('hero tem um único h1', () => {
    const html = renderToStaticMarkup(<LandingHero title="Gancho" summary="Resumo" />);
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it('pontos e passos sem itens não renderizam nada', () => {
    expect(renderToStaticMarkup(<LandingPoints id="x" title="T" items={[]} />)).toBe('');
    expect(renderToStaticMarkup(<LandingSteps id="y" title="T" steps={[]} />)).toBe('');
  });

  it('passos viram lista ordenada', () => {
    const html = renderToStaticMarkup(<LandingSteps id="y" title="Como" steps={[{ title: 'A' }, { title: 'B' }]} />);
    expect(html).toContain('<ol');
    expect(html.match(/<li/g)).toHaveLength(2);
  });
});
