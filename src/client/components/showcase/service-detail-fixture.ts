import type { FieldType, FormField, FormSchema, FormValues } from '../form-builder';
import type { ServiceRecord } from '../services/service-type';
import type { ServiceDetailLabels } from '../services/detail/category-style';

/**
 * Dados de exemplo (formato do formulário `eventos`, ver `docs/integracoes/eventos-depara.md` do
 * projeto consumidor) pra revisar visualmente o detalhe de um evento no showcase — o banco local
 * pode não ter nenhum. Nada aqui vai pra produção.
 */

const GRID = { xs: 12, sm: 12, md: 6, lg: 6, xl: 6, '2xl': 6 };

function f(
  key: string,
  type: FieldType,
  label: string,
  extra: Partial<FormField> = {}
): FormField {
  return {
    id: `fx_${key}`,
    key,
    name: key,
    type,
    label,
    grid: GRID,
    behavior: {},
    validation: {},
    appearance: {},
    ...extra,
  };
}

export const EVENT_FIXTURE_SCHEMA: FormSchema = {
  title: 'Eventos — detalhes e ingressos',
  fields: [
    f('secao_evento', 'heading', 'Evento'),
    f('data_inicio', 'datetime', 'Data e hora de início'),
    f('data_fim', 'datetime', 'Data e hora de término'),
    f('realizador', 'text', 'Realizador'),
    f('link', 'url', 'Link do evento'),
    f('endereco', 'text', 'Endereço'),
    f('classificacao_indicativa', 'select', 'Classificação indicativa', {
      options: [
        { label: 'Livre', value: 'Livre' },
        { label: '14 anos', value: '14 anos' },
        { label: '18 anos', value: '18 anos' },
      ],
    }),
    f('gratuito', 'switch', 'Evento gratuito'),
    f('observacoes', 'textarea', 'Observações'),
    f('artistas', 'list', 'Artistas e atrações', {
      itemFields: [f('nome', 'text', 'Nome')],
    }),
    f('secao_sessoes', 'heading', 'Datas e horários'),
    f('sessoes', 'list', 'Sessões', {
      itemFields: [
        f('data', 'date', 'Data'),
        f('abertura_portoes', 'time', 'Portões'),
        f('hora_inicio', 'time', 'Início'),
        f('hora_fim', 'time', 'Término'),
      ],
    }),
    f('secao_ingressos', 'heading', 'Ingressos'),
    f('ingressos', 'list', 'Tabela de ingressos', {
      itemFields: [
        f('titulo', 'text', 'Título'),
        f('setor', 'text', 'Setor'),
        f('tipo', 'select', 'Tipo', {
          options: [
            { label: 'Inteira', value: 'Inteira' },
            { label: 'Meia', value: 'Meia' },
          ],
        }),
        f('pessoas', 'number', 'Pessoas'),
        f('lote', 'text', 'Lote'),
        f('valor', 'currency', 'Valor'),
        f('comprar', 'text', 'Comprar'),
      ],
    }),
    f('link_ingresso', 'url', 'Link de ingressos'),
    f('pontos_de_venda', 'list', 'Pontos de venda', {
      itemFields: [f('nome', 'text', 'Nome')],
    }),
    f('contato_telefone', 'phone', 'Telefone'),
    f('contato_email', 'email', 'E-mail'),
    f('vazio_a', 'text', 'Campo sem resposta'),
  ],
};

export const EVENT_FIXTURE_ANSWERS: FormValues = {
  data_inicio: '2026-10-17T20:00',
  data_fim: '2026-10-17T23:30',
  realizador: 'cine-teatro-cuiaba',
  link: 'https://www.exemplo.com.br/eventos/noite-de-jazz',
  endereco: 'Cine Teatro Cuiabá — Av. Getúlio Vargas, 200, Centro, Cuiabá/MT',
  classificacao_indicativa: '14 anos',
  gratuito: false,
  observacoes: 'Abertura dos portões 1h antes. Meia-entrada conforme a lei; levar documento.',
  artistas: [{ nome: 'Orquestra Pantaneira' }, { nome: 'Maria Souza' }, { nome: 'Trio Cerrado' }],
  sessoes: [
    { data: '2026-10-18', abertura_portoes: '18:00', hora_inicio: '19:00', hora_fim: '21:00' },
    { data: '2026-10-17', abertura_portoes: '19:00', hora_inicio: '20:00', hora_fim: '22:00' },
  ],
  ingressos: [
    { titulo: 'Meia', setor: 'PLATEIA', tipo: 'Meia', pessoas: 1, valor: 80, comprar: 'Comprar ❯' },
    { titulo: 'Inteira', setor: 'PLATEIA', tipo: 'Inteira', pessoas: 1, valor: 160, lote: '1º lote', comprar: 'Comprar ❯' },
    { titulo: 'Camarote para quatro pessoas com serviço de bar', setor: 'CAMAROTE', pessoas: 4, valor: 900 },
    { titulo: 'Cortesia PCD', setor: 'PLATEIA', valor: 0 },
    // formato do importador: o título junta setor, o que inclui e a lotação
    { titulo: 'CAMAROTE PALCO — 10 pessoas + 10 copos + 01 Whisky OldPar (10 pessoas)', setor: 'CAMAROTE PALCO', pessoas: 10, valor: 1000 },
    { titulo: 'BISTRO (5 pessoas)', setor: 'BISTRO', pessoas: 5, valor: 300 },
  ],
  link_ingresso: 'https://www.exemplo.com.br/eventos/noite-de-jazz/ingressos',
  pontos_de_venda: [{ nome: 'Bilheteria do teatro' }, { nome: 'Disk ingresso' }],
  contato_telefone: '(65) 3000-0000',
  contato_email: 'contato@exemplo.com.br',
};

export const EVENT_FIXTURE_DESCRIPTION = `**Noite de Jazz no Cine Teatro** reúne três atrações da música instrumental de Mato Grosso em uma única noite.

- **Quando:** 17 e 18 de outubro de 2026
- **Onde:** Cine Teatro Cuiabá, Centro
- **Classificação:** 14 anos

### Informações úteis

1. Meia-entrada para estudantes e idosos, mediante documento.
2. Gratuidade para pessoas com deficiência; retirar a cortesia na bilheteria.

Saiba mais no [site do evento](https://www.exemplo.com.br/eventos/noite-de-jazz).`;

export const EVENT_FIXTURE_SERVICE = {
  id: '0',
  uid: 'fixture-evento',
  title: 'Noite de Jazz no Cine Teatro',
  categoryGroupId: null,
  categoryGroup: { id: '0', name: 'Eventos', slug: 'eventos' },
  categoryId: '0',
  category: { id: '0', name: 'Shows', slug: 'shows' },
  description: EVENT_FIXTURE_DESCRIPTION,
  startingPrice: 80,
  priceUnit: 'fixed',
  urgentAvailable: false,
  extras: {},
  status: 'active',
  sponsored: false,
  likeCount: 0,
  serviceLocation: null,
  active: true,
  expiresAt: null,
} as ServiceRecord;

export const EVENT_FIXTURE_LABELS: ServiceDetailLabels = {
  about: 'Sobre o evento',
  details: 'Informações do evento',
};

/**
 * Notícia de exemplo (variant `noticia`): formulário `noticias` (`data_publicacao`, `autor`, `fonte`,
 * `link`), várias fontes em `extras.fontes` e crédito da foto em `extras.imagem_credito`. A foto
 * vem de `extras.coverFileId` no app; aqui a página recebe a URL pronta via `NEWS_FIXTURE_COVER`.
 */
export const NEWS_FIXTURE_COVER =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1600&q=80';

export const NEWS_FIXTURE_ANSWERS: FormValues = {
  data_publicacao: '2026-10-25T08:00',
  autor: 'Redação',
  fonte: 'Prefeitura',
  link: 'https://www.exemplo.com.br/noticias/feira',
};

export const NEWS_FIXTURE_DESCRIPTION =
  '<p>A feira de produtores volta à praça central neste sábado, com 80 barracas de hortaliças, queijos e doces da região, das 6h às 12h.</p>' +
  '<h2>O que muda</h2>' +
  '<p>As barracas passam a ocupar as duas calçadas da praça e a rua lateral fica fechada para carros durante a feira.</p>' +
  '<ul><li><strong>Horário:</strong> sábados, das 6h às 12h.</li><li><strong>Pagamento:</strong> dinheiro, cartão e Pix.</li></ul>' +
  '<h3>Estacionamento</h3>' +
  '<p>O estacionamento do mercado municipal fica aberto ao público durante a feira, sem cobrança.</p>';

export const NEWS_FIXTURE_SERVICE = {
  id: '0',
  uid: 'fixture-noticia',
  title: 'Feira de produtores volta à praça central com 80 barracas neste sábado',
  categoryGroupId: null,
  categoryGroup: { id: '0', name: 'Notícias', slug: 'noticias' },
  categoryId: '0',
  category: { id: '0', name: 'Cidade', slug: 'cidade' },
  description: NEWS_FIXTURE_DESCRIPTION,
  startingPrice: 0,
  priceUnit: 'quote',
  urgentAvailable: false,
  extras: {
    fontes: [
      { nome: 'Prefeitura', url: 'https://www.exemplo.com.br/noticias/feira' },
      { nome: 'Associação dos Produtores', url: 'https://www.exemplo.org/feira' },
      { nome: 'Rádio Local' },
    ],
    imagem_credito: {
      autor: 'Fulano de Tal',
      licenca: 'CC BY 4.0',
      licenca_url: 'https://creativecommons.org/licenses/by/4.0/',
      pagina_origem: 'https://www.exemplo.com.br/fotos/feira',
      alt: 'Barracas de hortaliças enfileiradas na praça',
      legenda: 'Barracas da feira na edição de setembro. Imagem ilustrativa',
    },
  },
  status: 'active',
  sponsored: false,
  likeCount: 0,
  serviceLocation: null,
  active: true,
  expiresAt: null,
  createdAt: '2026-10-24T22:00:00Z',
} as ServiceRecord;
