import { afterEach, describe, expect, it } from 'vitest';
import { buildVocabulary, resetVocabulary, setVocabulary } from '../../../shared/vocabulary';
import { resolveContextRefs } from './context';

const context = { params: { id: '7' }, searchParams: {}, session: { tenantId: 't1' } };

describe('resolveContextRefs — $vocab', () => {
  afterEach(() => resetVocabulary());

  it('resolve frases do vocabulário (padrão publicacao) em qualquer profundidade', () => {
    const props = {
      title: '$vocab.manage',
      createAction: { label: '$vocab.new' },
      list: [{ text: '$vocab.noneFound' }],
    };
    expect(resolveContextRefs(props, context)).toEqual({
      title: 'Gerenciar publicações',
      createAction: { label: 'Nova publicação' },
      list: [{ text: 'Nenhuma publicação encontrada' }],
    });
  });

  it('segue o vocabulário registrado', () => {
    setVocabulary(buildVocabulary({ context: 'servico' }));
    expect(resolveContextRefs({ label: '$vocab.new' }, context)).toEqual({ label: 'Novo serviço' });
  });

  it('funciona sem context da requisição (RenderScreen sem context)', () => {
    expect(resolveContextRefs({ label: '$vocab.new', id: '$params.id' })).toEqual({
      label: 'Nova publicação',
      id: '$params.id',
    });
  });

  it('frase desconhecida vira undefined (a prop não é setada)', () => {
    expect(resolveContextRefs({ label: '$vocab.naoExiste' }, context)).toEqual({
      label: undefined,
    });
  });

  it('continua resolvendo $params e $session com context', () => {
    expect(resolveContextRefs({ a: '$params.id', b: '$session.tenantId' }, context)).toEqual({
      a: '7',
      b: 't1',
    });
  });
});
