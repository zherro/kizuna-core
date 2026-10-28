import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RouteCard } from './route-card';
import { StopTimeline } from './stop-timeline';
import { TurismoEmpty } from './turismo-empty';
import { TurismoSection } from './turismo-section';
import { PlaceCard } from './place-card';

describe('blocos de turismo', () => {
  it('RouteCard mostra tema, duração, dificuldade e paradas; sem foto usa o fundo quente', () => {
    const html = renderToStaticMarkup(
      <RouteCard
        item={{ href: '/cuiaba-mt/roteiros/a', title: 'Rota A', tema: 'Natureza', duracao: '1 dia', dificuldade: 'facil', paradas: 3 }}
      />
    );
    for (const t of ['Rota A', 'Natureza', '1 dia', 'Fácil', '3 paradas', 'href="/cuiaba-mt/roteiros/a"']) expect(html).toContain(t);
    expect(html).not.toContain('<img');
  });

  it('RouteCard esconde o que não tem', () => {
    const html = renderToStaticMarkup(<RouteCard item={{ href: '/x', title: 'T', dificuldade: 'xyz', paradas: 0 }} />);
    expect(html).not.toContain('parada');
    expect(html).not.toContain('xyz');
  });

  it('StopTimeline numera as paradas, linka e some sem paradas', () => {
    expect(renderToStaticMarkup(<StopTimeline stops={[]} />)).toBe('');
    const html = renderToStaticMarkup(
      <StopTimeline
        stops={[
          { title: 'Praça', href: '/cuiaba-mt/lugares/praca', address: 'Centro', photo: '/p.jpg' },
          { title: 'Mirante' },
        ]}
      />
    );
    expect(html).toContain('href="/cuiaba-mt/lugares/praca"');
    expect(html).toContain('Centro');
    expect(html).toContain('src="/p.jpg"');
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(html).toContain('Mirante');
  });

  it('TurismoSection sem filhos não renderiza; com filhos mostra título e Ver todos', () => {
    expect(renderToStaticMarkup(<TurismoSection title="X">{[]}</TurismoSection>)).toBe('');
    const html = renderToStaticMarkup(
      <TurismoSection title="Onde dormir" moreHref="/turismo/dormir">
        <span>a</span>
      </TurismoSection>
    );
    expect(html).toContain('Onde dormir');
    expect(html).toContain('href="/turismo/dormir"');
  });

  it('TurismoEmpty e PlaceCard (faixa de preço acessível)', () => {
    expect(renderToStaticMarkup(<TurismoEmpty actionHref="/turismo" />)).toContain('href="/turismo"');
    const html = renderToStaticMarkup(
      <PlaceCard item={{ href: '/x', title: 'Pousada', tipo: 'dormir', faixaPreco: '$$', address: 'Rua 1' }} />
    );
    expect(html).toContain('Faixa de preço: Intermediário');
    expect(html).toContain('Rua 1');
  });
});
