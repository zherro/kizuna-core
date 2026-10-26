import { describe, it, expect } from 'vitest';
import {
  formatNewsPublished,
  newsArticleMeta,
  newsPhotoCredit,
  newsSources,
  readingMinutes,
} from './noticia-helpers';

const TZ = 'America/Cuiaba';

const service = (over: Record<string, unknown> = {}) => ({
  description: '<p>Um dois três quatro.</p>',
  extras: {},
  createdAt: '2026-10-20T12:00:00Z',
  category: { id: '1', name: 'Cidade', slug: 'cidade' },
  categoryGroup: { id: '2', name: 'Notícias', slug: 'noticias' },
  ...over,
});

const fields = (answers: Record<string, unknown>) => ({ schema: { title: '', fields: [] }, answers });

describe('formatNewsPublished', () => {
  it('hora cheia vira "8h"; com minutos, "14h30"', () => {
    expect(formatNewsPublished(new Date('2026-10-25T12:00:00Z'), TZ)).toBe('25 de outubro de 2026, 8h');
    expect(formatNewsPublished(new Date('2026-10-25T18:30:00Z'), TZ)).toBe('25 de outubro de 2026, 14h30');
  });
});

describe('readingMinutes', () => {
  it('conta palavras do texto sem HTML (200/min, mínimo 1)', () => {
    expect(readingMinutes('<p>uma frase curta</p>')).toBe(1);
    expect(readingMinutes(`<p>${'palavra '.repeat(401)}</p>`)).toBe(3);
  });
  it('sem texto → null', () => {
    expect(readingMinutes('<p> </p>')).toBeNull();
    expect(readingMinutes(null)).toBeNull();
  });
});

describe('newsSources', () => {
  it('extras.fontes tem precedência, na ordem, URL só http(s)', () => {
    const s = newsSources(
      { fontes: [{ nome: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/x' }, { nome: 'Caixa', url: 'javascript:alert(1)' }, { nome: ' ' }, 'G1'] },
      { fonte: 'Outra', link: 'https://outra.com' }
    );
    expect(s).toEqual([
      { name: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/x' },
      { name: 'Caixa', url: null },
      { name: 'G1', url: null },
    ]);
  });
  it('sem extras.fontes usa fonte + link do formulário', () => {
    expect(newsSources({}, { fonte: 'Prefeitura', link: 'https://cuiaba.mt.gov.br/n' })).toEqual([
      { name: 'Prefeitura', url: 'https://cuiaba.mt.gov.br/n' },
    ]);
    expect(newsSources({ fontes: [] }, { link: 'https://www.exemplo.com/a' })).toEqual([
      { name: 'exemplo.com', url: 'https://www.exemplo.com/a' },
    ]);
    expect(newsSources({}, { link: 'ftp://x' })).toEqual([]);
  });
});

describe('newsPhotoCredit', () => {
  it('lê extras.imagem_credito, validando URLs', () => {
    expect(
      newsPhotoCredit({
        imagem_credito: {
          autor: 'Fulano',
          licenca: 'CC BY 4.0',
          licenca_url: 'https://creativecommons.org/licenses/by/4.0/',
          pagina_origem: 'data:text/html,x',
          alt: 'Fila numa lotérica',
          legenda: 'Apostadores no Centro',
        },
      })
    ).toEqual({
      author: 'Fulano',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: null,
      alt: 'Fila numa lotérica',
      caption: 'Apostadores no Centro',
    });
  });
  it('ausente ou vazio → null', () => {
    expect(newsPhotoCredit({})).toBeNull();
    expect(newsPhotoCredit({ imagem_credito: { autor: ' ' } })).toBeNull();
    expect(newsPhotoCredit({ imagem_credito: 'texto' })).toBeNull();
  });
});

describe('newsArticleMeta', () => {
  it('monta chapéu, data local, autor, fonte e crédito', () => {
    const meta = newsArticleMeta(
      service({ extras: { imagem_credito: { autor: 'Fulano', licenca: 'CC BY 4.0' } } }),
      fields({ data_publicacao: '2026-10-25T08:00', autor: 'Redação', fonte: 'Caixa', link: 'https://caixa.gov.br' }),
      { subcategoryNames: ['Loterias'], timeZone: TZ }
    );
    expect(meta.kicker).toBe('Loterias');
    expect(meta.category).toBe('Cidade');
    expect(meta.group).toBe('Notícias');
    expect(meta.publishedAt?.toISOString()).toBe('2026-10-25T12:00:00.000Z');
    expect(meta.publishedLabel).toBe('25 de outubro de 2026, 8h');
    expect(meta.author).toBe('Redação');
    expect(meta.sources).toEqual([{ name: 'Caixa', url: 'https://caixa.gov.br/' }]);
    expect(meta.source).toBe('Caixa');
    expect(meta.sourceUrl).toBe('https://caixa.gov.br/');
    expect(meta.photoCredit?.author).toBe('Fulano');
    expect(meta.readingMinutes).toBe(1);
  });

  it('sem respostas: chapéu da categoria, data de criação, nada inventado', () => {
    const meta = newsArticleMeta(service(), null, { timeZone: TZ });
    expect(meta.kicker).toBe('Cidade');
    expect(meta.publishedAt?.toISOString()).toBe('2026-10-20T12:00:00.000Z');
    expect(meta.author).toBeNull();
    expect(meta.sources).toEqual([]);
    expect(meta.source).toBeNull();
    expect(meta.photoCredit).toBeNull();
  });

  it('chapéu cai no grupo e depois em "Notícias"', () => {
    expect(newsArticleMeta(service({ category: null }), null).kicker).toBe('Notícias');
    expect(newsArticleMeta(service({ category: null, categoryGroup: null }), null).kicker).toBe('Notícias');
    expect(newsArticleMeta(service({ category: null, categoryGroup: { id: '1', name: 'Jornal' } }), null).kicker).toBe('Jornal');
  });
});
