// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { parseSource, resolveAdPlacement, resolveAdSource, sourceFromReferrer, withSource } from './source';

describe('source', () => {
  beforeEach(() => sessionStorage.clear());

  it('withSource preserva query e hash e ignora externos', () => {
    expect(withSource('/anuncios/a', 'search')).toBe('/anuncios/a?src=search');
    expect(withSource('/anuncios/a?x=1#t', 'home')).toBe('/anuncios/a?x=1&src=home#t');
    expect(withSource('https://x.com/a', 'search')).toBe('https://x.com/a');
  });
  it('parseSource valida', () => {
    expect(parseSource('search')).toBe('search');
    expect(parseSource('zzz')).toBeUndefined();
    expect(parseSource(null)).toBeUndefined();
  });
  it('referrer interno', () => {
    expect(sourceFromReferrer('http://a.com/busca?q=1', 'http://a.com')).toBe('search');
    expect(sourceFromReferrer('http://a.com/', 'http://a.com')).toBe('home');
    expect(sourceFromReferrer('http://b.com/', 'http://a.com')).toBeUndefined();
  });
  it('resolveAdSource usa ?src= e memoriza', () => {
    window.history.pushState({}, '', '/anuncios/u?src=share');
    expect(resolveAdSource('u')).toBe('share');
    window.history.pushState({}, '', '/anuncios/u');
    expect(resolveAdSource('u')).toBe('share');
    expect(resolveAdSource('outro')).toBe('direct');
  });
  it('withSource marca a vaga patrocinada com pl=sp', () => {
    expect(withSource('/anuncios/a', 'search', 'sponsored')).toBe('/anuncios/a?src=search&pl=sp');
    expect(withSource('/anuncios/a', 'home', null)).toBe('/anuncios/a?src=home');
  });
  it('origens novas: today, swipe e related', () => {
    expect(parseSource('today')).toBe('today');
    expect(parseSource('swipe')).toBe('swipe');
    expect(parseSource('related')).toBe('related');
    expect(sourceFromReferrer('http://a.com/cuiaba-mt/hoje', 'http://a.com')).toBe('today');
    expect(sourceFromReferrer('http://a.com/descobrir', 'http://a.com')).toBe('swipe');
  });
  it('resolveAdPlacement: ?pl=sp vale para o anúncio na sessão; sem ele, orgânico', () => {
    window.history.pushState({}, '', '/anuncios/p?src=search&pl=sp');
    expect(resolveAdPlacement('p')).toBe('sponsored');
    window.history.pushState({}, '', '/anuncios/p');
    expect(resolveAdPlacement('p')).toBe('sponsored');
    expect(resolveAdPlacement('outro')).toBeNull();
  });
});
