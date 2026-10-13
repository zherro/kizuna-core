import { describe, expect, it } from 'vitest';
import {
  resolveCategoryHue,
  resolveSectionTitles,
  resolveServiceCardVariant,
  resolveServiceDetailVariant,
  type ServiceDetailConfig,
} from './category-style';

const config: ServiceDetailConfig = {
  defaultVariant: 'base',
  variantByCategorySlug: { cinema: 'cinema' },
  variantByGroupSlug: { eventos: 'evento', cultura: 'cultura' },
  colors: {
    default: { hue: 100 },
    cinema: { hue: 268 },
    eventos: { hue: 25 },
  },
};

describe('resolveServiceDetailVariant', () => {
  it('cai em "service" sem config', () => {
    expect(resolveServiceDetailVariant('x')).toBe('service');
    expect(resolveServiceDetailVariant(null, null)).toBe('service');
    expect(resolveServiceDetailVariant({ slug: 'x', groupSlug: 'y' }, {})).toBe('service');
  });

  it('aceita string e { slug } (compatível)', () => {
    expect(resolveServiceDetailVariant('cinema', config)).toBe('cinema');
    expect(resolveServiceDetailVariant({ slug: 'cinema' }, config)).toBe('cinema');
  });

  it('resolve por groupSlug quando a categoria não está mapeada', () => {
    expect(resolveServiceDetailVariant({ slug: 'show', groupSlug: 'eventos' }, config)).toBe('evento');
    expect(resolveServiceDetailVariant({ groupSlug: 'eventos' }, config)).toBe('evento');
    expect(resolveServiceDetailVariant({ slug: null, groupSlug: 'eventos' }, config)).toBe('evento');
  });

  it('slug da categoria tem precedência sobre o grupo', () => {
    expect(resolveServiceDetailVariant({ slug: 'cinema', groupSlug: 'eventos' }, config)).toBe('cinema');
  });

  it('cai em defaultVariant quando nem categoria nem grupo casam', () => {
    expect(resolveServiceDetailVariant({ slug: 'a', groupSlug: 'b' }, config)).toBe('base');
    expect(resolveServiceDetailVariant({ slug: 'a', groupSlug: null }, config)).toBe('base');
  });

  it('string solta não é tratada como groupSlug', () => {
    expect(resolveServiceDetailVariant('eventos', config)).toBe('base');
  });
});

describe('resolveCategoryHue', () => {
  it('230 sem config', () => {
    expect(resolveCategoryHue('x')).toBe(230);
    expect(resolveCategoryHue({ slug: 'x', groupSlug: 'y' }, {})).toBe(230);
  });

  it('colors[slug] > colors[groupSlug] > default', () => {
    expect(resolveCategoryHue({ slug: 'cinema', groupSlug: 'eventos' }, config)).toBe(268);
    expect(resolveCategoryHue({ slug: 'show', groupSlug: 'eventos' }, config)).toBe(25);
    expect(resolveCategoryHue({ groupSlug: 'eventos' }, config)).toBe(25);
    expect(resolveCategoryHue({ slug: 'a', groupSlug: 'b' }, config)).toBe(100);
    expect(resolveCategoryHue('cinema', config)).toBe(268);
  });
});

describe('resolveServiceCardVariant', () => {
  const withCard: ServiceDetailConfig = { ...config, cardVariantByCategorySlug: { teatro: 'cinema' } };

  it('cardVariantByCategorySlug muda só o card', () => {
    const teatro = { slug: 'teatro', groupSlug: 'eventos' };
    expect(resolveServiceCardVariant(teatro, withCard)).toBe('cinema');
    expect(resolveServiceDetailVariant(teatro, withCard)).toBe('evento');
  });

  it('sem entrada de card, segue a variant do detalhe', () => {
    expect(resolveServiceCardVariant({ slug: 'show', groupSlug: 'eventos' }, withCard)).toBe('evento');
    expect(resolveServiceCardVariant('cinema', withCard)).toBe('cinema');
  });
});

describe('resolveSectionTitles', () => {
  const titles: ServiceDetailConfig = {
    sectionTitles: {
      default: { about: 'Sobre o anúncio' },
      eventos: { about: 'Sobre o evento', details: 'Informações do evento' },
      teatro: { details: 'Ficha do espetáculo' },
    },
  };

  it('cai nos textos de "serviço" sem config', () => {
    expect(resolveSectionTitles('x')).toEqual({ about: 'Sobre o serviço', details: 'Detalhes do serviço' });
    expect(resolveSectionTitles({ slug: 'x', groupSlug: 'y' }, {})).toEqual({
      about: 'Sobre o serviço',
      details: 'Detalhes do serviço',
    });
  });

  it('usa o grupo quando a categoria não tem entrada', () => {
    expect(resolveSectionTitles({ slug: 'shows', groupSlug: 'eventos' }, titles)).toEqual({
      about: 'Sobre o evento',
      details: 'Informações do evento',
    });
  });

  it('categoria > grupo > default, chave a chave', () => {
    expect(resolveSectionTitles({ slug: 'teatro', groupSlug: 'eventos' }, titles)).toEqual({
      about: 'Sobre o evento',
      details: 'Ficha do espetáculo',
    });
    expect(resolveSectionTitles({ slug: 'outra', groupSlug: 'nada' }, titles)).toEqual({
      about: 'Sobre o anúncio',
      details: 'Detalhes do serviço',
    });
  });

  it('ignora texto vazio', () => {
    expect(resolveSectionTitles('a', { sectionTitles: { a: { about: '  ' } } }).about).toBe('Sobre o serviço');
  });
});
