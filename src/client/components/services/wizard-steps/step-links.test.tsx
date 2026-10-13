// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
// O provider real importa `@/i18n/messages` (alias do projeto consumidor) — o passo só precisa do hook.
vi.mock('../../../providers/app-preferences-provider', () => ({
  useAppPreferences: () => ({ messages: {} }),
  AppPreferencesProvider: ({ children }: { children: unknown }) => children,
}));

import { linksStep, StepLinks, currentLinks } from './step-links';
import type { ServiceWizardState } from '../service-type';
import type { WizardStepContext, WizardStepProps } from '../../wizard/types';

afterEach(cleanup);

const baseState = {
  codigo: '',
  tagsText: '',
  vinculosTitulo: '',
} as unknown as ServiceWizardState;

const ctx = (over: Partial<WizardStepContext<ServiceWizardState>> & { state?: Partial<ServiceWizardState> } = {}) =>
  ({
    state: { ...baseState, ...(over.state ?? {}) },
    entities: {},
    resourceId: '7',
    persistExtras: vi.fn(async () => ({ ok: true })),
    patch: vi.fn(),
    ...over,
    ...(over.state ? { state: { ...baseState, ...over.state } } : {}),
  }) as unknown as WizardStepContext<ServiceWizardState>;

describe('passo links: visibilidade pela permissão', () => {
  const enabled = linksStep.enabled as (c: unknown) => boolean;

  it('some sem a permissão (mesmo com anúncio salvo)', () => {
    expect(enabled(ctx({ entities: {} }))).toBe(false);
    expect(enabled(ctx({ entities: { canLinkService: false } }))).toBe(false);
  });

  it('aparece com a permissão e anúncio salvo; sem id ainda não', () => {
    expect(enabled(ctx({ entities: { canLinkService: true } }))).toBe(true);
    expect(enabled(ctx({ entities: { canLinkService: true }, resourceId: null }))).toBe(false);
  });
});

describe('passo links: payload', () => {
  it('só envia as chaves que mudaram, normalizadas, via persistExtras', async () => {
    const c = ctx({
      entities: { canLinkService: true },
      state: {
        codigo: ' Casa-X ',
        tagsText: 'Shows, casa-y ;  shows',
        vinculosTitulo: '',
        linksSnapshot: { codigo: '', tags: [], vinculosTitulo: '' },
      },
    });
    await linksStep.persist!(c);
    expect(c.persistExtras).toHaveBeenCalledTimes(1);
    expect(c.persistExtras).toHaveBeenCalledWith({ codigo: 'casa-x', tags: ['shows', 'casa-y'] });
  });

  it('nada mudou: não grava', async () => {
    const c = ctx({
      entities: { canLinkService: true },
      state: {
        codigo: 'casa-x',
        tagsText: 'a, b',
        vinculosTitulo: 'Agenda',
        linksSnapshot: { codigo: 'casa-x', tags: ['a', 'b'], vinculosTitulo: 'Agenda' },
      },
    });
    await linksStep.persist!(c);
    expect(c.persistExtras).not.toHaveBeenCalled();
  });

  it('limpar um campo grava null / lista vazia (o banco trata como vazio)', async () => {
    const c = ctx({
      entities: { canLinkService: true },
      state: {
        codigo: '',
        tagsText: '',
        vinculosTitulo: '',
        linksSnapshot: { codigo: 'casa-x', tags: ['a'], vinculosTitulo: 'Agenda' },
      },
    });
    await linksStep.persist!(c);
    expect(c.persistExtras).toHaveBeenCalledWith({ codigo: null, tags: [], vinculosTitulo: null });
  });

  it('sem a permissão nunca grava, nem com estado preenchido', async () => {
    const c = ctx({
      entities: {},
      state: { codigo: 'casa-x', tagsText: 'a', vinculosTitulo: 'x' },
    });
    await linksStep.persist!(c);
    expect(c.persistExtras).not.toHaveBeenCalled();
  });

  it('currentLinks parseia o texto de tags', () => {
    expect(currentLinks({ codigo: 'a', tagsText: 'B, c', vinculosTitulo: 'T' }).tags).toEqual(['b', 'c']);
  });
});

describe('passo links: validação', () => {
  it('canContinue barra formato inválido, libera válido ou vazio', () => {
    const cc = linksStep.canContinue!;
    expect(cc(ctx({ state: { codigo: 'Casa X' } }))).toBe(false);
    expect(cc(ctx({ state: { tagsText: 'ok, a b' } }))).toBe(false);
    expect(cc(ctx({ state: { tagsText: 'a,b,c,d,e,f,g,h,i,j,k' } }))).toBe(false);
    expect(cc(ctx({ state: { vinculosTitulo: 'x'.repeat(61) } }))).toBe(false);
    expect(cc(ctx({ state: { codigo: 'casa-x', tagsText: 'a, local:b', vinculosTitulo: 'Agenda' } }))).toBe(true);
    expect(cc(ctx())).toBe(true);
  });

  it('mostra as mensagens depois de sair do campo', () => {
    const props = {
      ...ctx({ state: { codigo: 'Casa X', tagsText: 'a b' } }),
    } as unknown as WizardStepProps<ServiceWizardState>;
    render(<StepLinks {...props} />);
    expect(screen.queryByText(/Use minúsculas, números, ponto/)).toBeNull();
    fireEvent.blur(screen.getByLabelText('Código'));
    expect(screen.getByText(/Use minúsculas, números, ponto/)).toBeTruthy();
    expect(screen.getByText(/Cada tag usa minúsculas/)).toBeTruthy();
  });
});
