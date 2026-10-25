// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  ArticleLayout,
  ArticleHeader,
  ArticleBody,
  ArticleCredits,
  ArticleByline,
  ArticleFigure,
  ArticleSources,
  formatDateBR,
} from './index';

afterEach(cleanup);

describe('formatDateBR', () => {
  it('AAAA-MM-DD vira DD/MM/AAAA sem passar por fuso', () => {
    expect(formatDateBR('2026-10-03')).toBe('03/10/2026');
  });
  it('entrada fora do formato volta como veio', () => {
    expect(formatDateBR('ontem')).toBe('ontem');
  });
});

describe('ArticleHeader', () => {
  it('mostra kicker, título, resumo e data de atualização', () => {
    render(
      <ArticleHeader kicker="Casa noturna · Cuiabá" title="Lua Morena" summary="Um resumo." updatedAt="2026-10-11" />
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Lua Morena' })).toBeTruthy();
    expect(screen.getByText('Casa noturna · Cuiabá')).toBeTruthy();
    expect(screen.getByText('Um resumo.')).toBeTruthy();
    expect(screen.getByText(/Atualizado em 11\/10\/2026/)).toBeTruthy();
  });

  it('omite o que não veio', () => {
    render(<ArticleHeader title="Só título" />);
    expect(screen.queryByText(/Atualizado em/)).toBeNull();
  });
});

describe('ArticleBody', () => {
  it('renderiza Markdown', () => {
    render(<ArticleBody markdown={'## História\n\nTexto com **destaque**.\n\n- um\n- dois'} />);
    expect(screen.getByRole('heading', { level: 2, name: 'História' })).toBeTruthy();
    expect(screen.getByText('destaque').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('não renderiza HTML cru do texto', () => {
    const { container } = render(<ArticleBody markdown={'<script>alert(1)</script>\n\nok'} />);
    expect(container.querySelector('script')).toBeNull();
  });

  it('não vaza a prop `node` do react-markdown para o DOM', () => {
    const { container } = render(
      <ArticleBody
        markdown={'## Titulo\n\nTexto com [link](https://exemplo.com) e **forte**.\n\n- um\n- dois\n\n> citacao\n\n---\n\n![alt](/a.jpg)'}
      />
    );
    expect(container.querySelectorAll('[node]').length).toBe(0);
  });

  it('`#` no corpo vira h2 (sem um segundo h1)', () => {
    const { container } = render(<ArticleBody markdown={'# Titulo'} />);
    expect(container.querySelector('h1')).toBeNull();
    const h2s = container.querySelectorAll('h2');
    expect(h2s).toHaveLength(1);
    expect(h2s[0].textContent).toBe('Titulo');
  });

  it('URL javascript: nunca vira href', () => {
    const { container } = render(<ArticleBody markdown={'[x](javascript:alert(1))'} />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.toLowerCase().startsWith('javascript:'))).toBe(false);
  });

  it('link externo abre em nova aba com noopener', () => {
    render(<ArticleBody markdown={'[link](https://exemplo.com)'} />);
    const a = screen.getByRole('link', { name: 'link' });
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('markdown vazio não renderiza nada', () => {
    const { container } = render(<ArticleBody markdown="   " />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ArticleCredits', () => {
  it('mostra o texto e some quando vazio', () => {
    const { container, rerender } = render(<ArticleCredits text="Fotos: Fulano / CC BY 4.0" />);
    expect(screen.getByText('Fotos: Fulano / CC BY 4.0')).toBeTruthy();
    rerender(<ArticleCredits text="" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ArticleLayout', () => {
  it('mantém a ordem header, media, actions, conteúdo, aside, footer no DOM', () => {
    const { container } = render(
      <ArticleLayout
        header={<div>HEADER</div>}
        media={<div>MEDIA</div>}
        actions={<div>ACTIONS</div>}
        aside={<div>ASIDE</div>}
        footer={<div>FOOTER</div>}
      >
        <div>CONTEUDO</div>
      </ArticleLayout>
    );
    const order = ['HEADER', 'MEDIA', 'ACTIONS', 'CONTEUDO', 'ASIDE', 'FOOTER'];
    const text = container.textContent ?? '';
    const positions = order.map((t) => text.indexOf(t));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('a raiz é um contêiner simples, sem landmark main (o shell do app já fornece)', () => {
    const { container } = render(
      <ArticleLayout header={<div>H</div>}>
        <div>C</div>
      </ArticleLayout>
    );
    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.querySelector('main')).toBeNull();
  });

  it('sem aside e sem media renderiza só o que existe', () => {
    const { container } = render(
      <ArticleLayout header={<div>H</div>}>
        <div>C</div>
      </ArticleLayout>
    );
    expect(container.querySelector('aside')).toBeNull();
    expect(container.textContent).toBe('HC');
  });
});

describe('ArticleByline', () => {
  it('autor, data em <time> e tempo de leitura; nada → null', () => {
    const date = new Date('2026-10-25T12:00:00Z');
    const { container, rerender } = render(
      <ArticleByline author="Redação" publishedAt={date} publishedLabel="25 de outubro de 2026, 8h" readingMinutes={3} />
    );
    expect(screen.getByText('Redação')).toBeTruthy();
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe(date.toISOString());
    expect(screen.getByText('3 min de leitura')).toBeTruthy();
    rerender(<ArticleByline />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ArticleFigure', () => {
  it('foto com alt, legenda e crédito com links externos', () => {
    const { container } = render(
      <ArticleFigure
        src="/a.jpg"
        alt="Praça"
        caption="Legenda"
        credit={{ author: 'Fulano', license: 'CC BY 4.0', licenseUrl: 'https://cc.org/by', sourceUrl: 'https://origem.org/a' }}
      />
    );
    expect(screen.getByRole('img').getAttribute('alt')).toBe('Praça');
    expect(screen.getByText('Legenda')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Fulano' }).getAttribute('href')).toBe('https://origem.org/a');
    const license = screen.getByRole('link', { name: 'CC BY 4.0' });
    expect(license.getAttribute('href')).toBe('https://cc.org/by');
    expect(license.getAttribute('rel')).toContain('noopener');
    expect(container.querySelector('figcaption')?.textContent).toContain('Foto: Fulano / CC BY 4.0');
  });

  it('sem legenda nem crédito, sem figcaption', () => {
    const { container } = render(<ArticleFigure src="/a.jpg" alt="x" />);
    expect(container.querySelector('figcaption')).toBeNull();
  });
});

describe('ArticleSources', () => {
  it('"Fonte" com uma, "Fontes" com várias, links só quando há url', () => {
    const { container, rerender } = render(<ArticleSources sources={[{ name: 'Caixa', url: 'https://caixa.gov.br' }]} />);
    expect(container.textContent).toBe('Fonte: Caixa');
    expect(screen.getByRole('link', { name: 'Caixa' }).getAttribute('target')).toBe('_blank');
    rerender(
      <ArticleSources sources={[{ name: 'A', url: 'https://a.com' }, { name: 'B' }, { name: 'C', url: null }]} />
    );
    expect(container.textContent).toBe('Fontes: A, B e C');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    rerender(<ArticleSources sources={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
