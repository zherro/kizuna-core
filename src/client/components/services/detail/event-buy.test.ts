import { describe, expect, it } from 'vitest';
import { eventBuyActions, eventBuyUrl, eventWhatsapp, whatsappFromHowToBuy } from './event-buy';

describe('whatsappFromHowToBuy', () => {
  it('lê o número da linha "Como comprar" (formato do importador)', () => {
    const desc = '**SIMPLESMENTE ROUPA NOVA** acontece em Cuiabá.\n\n- **Onde:** Cuiabá\n- **Como comprar:** WhatsApp (65) 9.9953-1935';
    expect(whatsappFromHowToBuy(desc)?.replace(/\D/g, '')).toBe('65999531935');
  });

  it('sem número logo depois de "WhatsApp", não supõe nada', () => {
    expect(whatsappFromHowToBuy('- **Como comprar:** WhatsApp, online e bilheteria no Pantanal Shopping')).toBeNull();
    expect(whatsappFromHowToBuy('- **Como comprar:** site')).toBeNull();
    // número fora da linha "Como comprar"
    expect(whatsappFromHowToBuy('Contato: WhatsApp (65) 99999-0000\n- **Como comprar:** bilheteria')).toBeNull();
    expect(whatsappFromHowToBuy(null)).toBeNull();
  });
});

describe('eventWhatsapp', () => {
  it('prefere o contato_whatsapp do formulário', () => {
    expect(eventWhatsapp({ contato_whatsapp: '(65) 1111-2222' }, '**Como comprar:** WhatsApp (65) 9.9953-1935')).toBe('(65) 1111-2222');
  });
});

describe('eventBuyUrl', () => {
  it('link_ingresso geral primeiro', () => {
    expect(eventBuyUrl({ link_ingresso: 'https://geral.test/e' }, [{ label: '', venue: null, link: 'https://p.test' }])).toBe('https://geral.test/e');
  });

  it('sem geral: ponto sem lugar com link; depois ponto com lugar com link', () => {
    const venue = { uid: 'v', title: 'Casa', href: '/c' } as never;
    expect(eventBuyUrl({}, [{ label: 'Casa', venue, link: 'https://casa.test' }, { label: '', venue: null, link: 'https://p.test' }])).toBe('https://p.test/');
    expect(eventBuyUrl({}, [{ label: 'Casa', venue, link: 'https://casa.test' }])).toBe('https://casa.test/');
    expect(eventBuyUrl({}, [{ label: 'X', venue: null, link: 'javascript:alert(1)' }])).toBeNull();
  });
});

describe('eventBuyActions', () => {
  const buyUrl = 'https://compra.test/x';
  const whatsapp = '(65) 9.9953-1935';

  it('com link e WhatsApp: comprar é a principal, WhatsApp a secundária', () => {
    expect(eventBuyActions({ over: false, buyUrl, whatsapp })).toEqual({
      primary: { channel: 'purchase', href: buyUrl },
      secondary: { channel: 'whatsapp', href: 'https://wa.me/5565999531935' },
    });
  });

  it('só link: comprar sem secundária', () => {
    expect(eventBuyActions({ over: false, buyUrl, whatsapp: null })).toEqual({ primary: { channel: 'purchase', href: buyUrl }, secondary: null });
  });

  it('só WhatsApp: WhatsApp é a principal', () => {
    expect(eventBuyActions({ over: false, buyUrl: null, whatsapp })?.primary.channel).toBe('whatsapp');
  });

  it('evento encerrado ou sem forma de comprar: sem barra', () => {
    expect(eventBuyActions({ over: true, buyUrl, whatsapp })).toBeNull();
    expect(eventBuyActions({ over: false, buyUrl: null, whatsapp: null })).toBeNull();
  });
});
