import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_VOCABULARY_CONTEXT,
  buildVocabulary,
  getVocabulary,
  parseVocabularyConfig,
  resetVocabulary,
  setVocabulary,
} from './index';

describe('parseVocabularyConfig', () => {
  it('sem config vale o contexto padrão (publicacao)', () => {
    const vocab = parseVocabularyConfig(undefined);
    expect(vocab.context).toBe(DEFAULT_VOCABULARY_CONTEXT);
    expect(DEFAULT_VOCABULARY_CONTEXT).toBe('publicacao');
  });

  it('preset publicacao: frases no feminino', () => {
    const { phrases } = parseVocabularyConfig({ context: 'publicacao' });
    expect(phrases.singular).toBe('Publicação');
    expect(phrases.plural).toBe('Publicações');
    expect(phrases.new).toBe('Nova publicação');
    expect(phrases.manage).toBe('Gerenciar publicações');
    expect(phrases.yours).toBe('Suas publicações');
    expect(phrases.mine).toBe('Minhas publicações');
    expect(phrases.createFirst).toBe('Criar primeira publicação');
    expect(phrases.noneRegistered).toBe('Nenhuma publicação cadastrada ainda.');
    expect(phrases.registerFirstHint).toBe('Cadastre sua primeira publicação para começar.');
    expect(phrases.noneFound).toBe('Nenhuma publicação encontrada');
    expect(phrases.reviewTitle).toBe('Revisão de publicações');
  });

  it('preset servico: frases no masculino (vocabulário anterior)', () => {
    const { phrases } = parseVocabularyConfig({ context: 'servico' });
    expect(phrases.new).toBe('Novo serviço');
    expect(phrases.yours).toBe('Seus serviços');
    expect(phrases.mine).toBe('Meus serviços');
    expect(phrases.createFirst).toBe('Criar primeiro serviço');
    expect(phrases.noneRegistered).toBe('Nenhum serviço cadastrado ainda.');
    expect(phrases.noneFound).toBe('Nenhum serviço encontrado');
  });

  it('override de termo com gênero recompõe as frases', () => {
    const { phrases } = parseVocabularyConfig({
      terms: { item: { singular: 'Anúncio', plural: 'Anúncios', gender: 'm' } },
    });
    expect(phrases.new).toBe('Novo anúncio');
    expect(phrases.mine).toBe('Meus anúncios');
    expect(phrases.noneRegistered).toBe('Nenhum anúncio cadastrado ainda.');
  });

  it('override de frase vence a derivada', () => {
    const { phrases } = parseVocabularyConfig({ phrases: { new: 'Anunciar' } });
    expect(phrases.new).toBe('Anunciar');
    expect(phrases.manage).toBe('Gerenciar publicações');
  });

  it('trocar o substantivo sem informar o gênero é erro', () => {
    expect(() => parseVocabularyConfig({ terms: { item: { singular: 'Anúncio' } } })).toThrow(
      /gender/
    );
  });

  it('rejeita contexto, gênero, termo e frase desconhecidos', () => {
    expect(() => parseVocabularyConfig({ context: 'inexistente' })).toThrow(/context/);
    expect(() =>
      parseVocabularyConfig({ terms: { item: { singular: 'X', plural: 'Xs', gender: 'n' } } })
    ).toThrow(/gender/);
    expect(() => parseVocabularyConfig({ terms: { outro: {} } })).toThrow(/terms/);
    expect(() => parseVocabularyConfig({ phrases: { naoExiste: 'x' } })).toThrow(/phrases/);
    expect(() => parseVocabularyConfig({ phrases: { new: '' } })).toThrow(/phrases/);
    expect(() => parseVocabularyConfig('publicacao')).toThrow(/vocabulary/);
  });
});

describe('registro global', () => {
  afterEach(() => resetVocabulary());

  it('getVocabulary cai no padrão quando nada foi registrado', () => {
    expect(getVocabulary().phrases.new).toBe('Nova publicação');
  });

  it('setVocabulary substitui o vocabulário lido por getVocabulary', () => {
    setVocabulary(buildVocabulary({ context: 'servico' }));
    expect(getVocabulary().phrases.new).toBe('Novo serviço');
  });
});
