'use client';

import { useState } from 'react';
import { Input } from '../../ui/input';
import type { WizardStep, WizardStepContext, WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
import {
  MAX_LINKED_TITLE_LENGTH,
  buildServiceLinksPatch,
  parseTagsInput,
  validateServiceLinks,
  type ServiceLinksValues,
} from '../../../../shared/service-tags';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

const EMPTY: ServiceLinksValues = { codigo: '', tags: [], vinculosTitulo: '' };

/** Valores atuais do editor, a partir do estado do wizard. */
export function currentLinks(state: Partial<ServiceWizardState>): ServiceLinksValues {
  return {
    codigo: state.codigo ?? '',
    tags: parseTagsInput(state.tagsText ?? ''),
    vinculosTitulo: state.vinculosTitulo ?? '',
  };
}

/** O usuário logado tem `services.link`? A página do wizard grava isso em `entities`. */
export function canLinkService(ctx: Pick<WizardStepContext<ServiceWizardState>, 'entities'>): boolean {
  return (ctx.entities as Record<string, unknown>).canLinkService === true;
}

/**
 * Seção opcional "Vínculos": `extras.codigo`, `extras.tags` e `extras.vinculosTitulo`. Só aparece
 * (e só grava) para quem tem a permissão `services.link`; o banco também exige (trigger do plugin
 * services 0012). Nunca mexe em outras chaves de `extras`.
 */
export function StepLinks({ state, patch }: WizardStepProps<ServiceWizardState>) {
  const [touched, setTouched] = useState(false);
  const values = currentLinks(state);
  const errors = validateServiceLinks(values);
  const show = (key: keyof ServiceLinksValues) => (touched ? errors[key] : undefined);

  return (
    <div className="space-y-6">
      <StepHeader
        title="Vínculos"
        subtitle="Código deste anúncio e tags que ligam anúncios entre si (opcional)."
      />

      <div className="space-y-1.5">
        <label htmlFor="links-codigo" className="text-sm font-medium">
          Código
        </label>
        <Input
          id="links-codigo"
          value={state.codigo ?? ''}
          onChange={(e) => patch({ codigo: e.target.value })}
          onBlur={() => setTouched(true)}
          placeholder="espaco-art-festas-e-eventos"
          maxLength={60}
          aria-invalid={Boolean(show('codigo'))}
        />
        <p className="text-xs text-muted-foreground">
          Outros anúncios citam este código nas tags para aparecerem vinculados a este.
        </p>
        {show('codigo') ? <p className="text-xs text-destructive">{show('codigo')}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="links-tags" className="text-sm font-medium">
          Tags
        </label>
        <Input
          id="links-tags"
          value={state.tagsText ?? ''}
          onChange={(e) => patch({ tagsText: e.target.value })}
          onBlur={() => setTouched(true)}
          placeholder="casas-de-festas, espaco-art-festas-e-eventos"
          aria-invalid={Boolean(show('tags'))}
        />
        <p className="text-xs text-muted-foreground">
          Separe por vírgula. Para vincular a outro anúncio, use o código dele.
        </p>
        {show('tags') ? <p className="text-xs text-destructive">{show('tags')}</p> : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="links-titulo" className="text-sm font-medium">
          Título dos vinculados
        </label>
        <Input
          id="links-titulo"
          value={state.vinculosTitulo ?? ''}
          onChange={(e) => patch({ vinculosTitulo: e.target.value })}
          onBlur={() => setTouched(true)}
          placeholder="Vinculados"
          aria-invalid={Boolean(show('vinculosTitulo'))}
        />
        <p className="text-xs text-muted-foreground">
          Título do carrossel dos anúncios vinculados (até {MAX_LINKED_TITLE_LENGTH} caracteres).
        </p>
        {show('vinculosTitulo') ? (
          <p className="text-xs text-destructive">{show('vinculosTitulo')}</p>
        ) : null}
      </div>

      <StepHint tone="tip">
        Só quem tem a permissão de vínculos vê esta seção. Código e tags aceitam minúsculas, números,
        hífen, ponto e sublinhado (tags também dois-pontos).
      </StepHint>
    </div>
  );
}

export const linksStep: WizardStep<ServiceWizardState> = {
  key: 'links',
  label: 'Vínculos',
  Component: StepLinks,
  // Só com a permissão (lida pela página do wizard) e depois que o anúncio existe.
  enabled: (ctx) => canLinkService(ctx) && ctx.resourceId != null,
  canContinue: (ctx) => Object.keys(validateServiceLinks(currentLinks(ctx.state))).length === 0,
  persist: async (ctx) => {
    if (!canLinkService(ctx)) return;
    const patch = buildServiceLinksPatch(currentLinks(ctx.state), ctx.state.linksSnapshot ?? EMPTY);
    if (Object.keys(patch).length === 0) return;
    const r = await ctx.persistExtras(patch);
    if (!r.ok) throw new Error('Nao foi possivel salvar os vinculos.');
    ctx.patch({
      linksSnapshot: currentLinks(ctx.state),
    });
  },
};
