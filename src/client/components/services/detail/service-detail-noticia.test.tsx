import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewsArticle } from './service-detail-noticia';
import { newsArticleMeta } from './noticia-helpers';

const service = {
  description: '<p>Lide da matéria.</p><h2>Contexto</h2><p>Mais texto.</p>',
  extras: {
    fontes: [{ nome: 'Caixa', url: 'https://caixa.gov.br' }, { nome: 'Agência Brasil' }],
    imagem_credito: { autor: 'Fulano', licenca: 'CC BY 4.0', alt: 'Lotérica', legenda: 'Fila na lotérica' },
  },
  createdAt: '2026-10-20T12:00:00Z',
  category: { id: '1', name: 'Cidade' },
  categoryGroup: { id: '2', name: 'Notícias', slug: 'noticias' },
};

function html(over: Partial<Parameters<typeof NewsArticle>[0]> = {}) {
  const meta = newsArticleMeta(service, { schema: { title: '', fields: [] }, answers: { autor: 'Redação', data_publicacao: '2026-10-25T08:00' } }, {
    subcategoryNames: ['Loterias'],
    timeZone: 'America/Cuiaba',
  });
  return renderToStaticMarkup(
    <NewsArticle title="Mega-Sena acumula" meta={meta} coverUrl="/capa.jpg" body={service.description} {...over} />
  );
}

describe('NewsArticle', () => {
  it('matéria: h1, chapéu, autor/data, foto com alt do crédito, h2 do corpo e fontes', () => {
    const out = html();
    expect(out).toMatch(/<h1[^>]*>Mega-Sena acumula<\/h1>/);
    expect(out).toContain('Loterias');
    expect(out).toContain('Redação');
    expect(out).toContain('25 de outubro de 2026, 8h');
    expect(out).toContain('alt="Lotérica"');
    expect(out).toContain('Fila na lotérica');
    expect(out).toContain('<h2>Contexto</h2>');
    expect(out).toContain('Fontes:');
    expect(out).toContain('href="https://caixa.gov.br/"');
  });

  it('nada de oferta: sem preço, avaliações ou prestador', () => {
    const out = html();
    expect(out).not.toMatch(/Sob consulta|Detalhes do serviço|Prestador|avalia/i);
  });

  it('sem capa não renderiza figure', () => {
    expect(html({ coverUrl: null })).not.toContain('<figure');
  });
});
