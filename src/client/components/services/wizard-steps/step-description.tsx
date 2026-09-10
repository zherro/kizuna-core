'use client';

import { Check } from 'lucide-react';
import { QuillEditor } from '../../ui/quill-editor';
import { cn } from '../../../../lib/utils';
import type { WizardStepProps } from '../../wizard/types';
import { useWizardLayout } from '../../wizard/wizard-layout';
import { stripHtml, type ServiceCategory, type ServiceWizardState } from '../service-type';
import { ServiceConfigSummary } from '../service-config-summary';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

/** Mantido em sincronia com `canContinue` do step `description` no index.ts. */
export const DESCRIPTION_MIN_LENGTH = 20;

export function StepDescription({ state, patch, entities }: WizardStepProps<ServiceWizardState>) {
  const value = state.description ?? '';
  const length = stripHtml(value).length;
  const met = length >= DESCRIPTION_MIN_LENGTH;

  // In the stacked (scroll) layout every field the summary recaps is already visible above — drop
  // it to cut the redundant block and the extra scroll distance.
  const { stacked } = useWizardLayout();

  const groups = (entities.groups as Array<{ id: string | number; name: string }> | undefined) ?? [];
  const categories = (entities.categories as ServiceCategory[] | undefined) ?? [];
  const subcategories =
    (entities.subcategories as Array<{ id: string | number; name: string }> | undefined) ?? [];

  const selectedGroup = groups.find((g) => String(g.id) === String(state.groupId));
  const selectedCategory = categories.find((c) => String(c.id) === String(state.categoryId));
  const selectedSubcategoryNames = subcategories
    .filter((s) => state.subcategoryIds.includes(String(s.id)))
    .map((s) => s.name);

  return (
    <div className="space-y-6">
      <StepHeader
        title="Conte um pouco sobre o seu trabalho"
        subtitle="Escreva com suas palavras: sua experiência, o que faz de diferente e como você atende."
        why="É aqui que o cliente decide entre te chamar ou passar para o próximo anúncio. Responder as dúvidas comuns (experiência, o que está incluso, prazo, garantia) evita idas e vindas no chat e traz contatos mais decididos."
      />

      <QuillEditor
        value={value}
        onChange={(v) => patch({ description: v })}
        placeholder="Ex.: Sou eletricista há 12 anos, trabalho com instalações residenciais e prediais. Faço orçamento sem compromisso e ofereço garantia de 90 dias no serviço."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Dica: experiência, região atendida, o que está incluso, prazo e garantia.
        </span>
        <span
          className={cn(
            'flex items-center gap-1 font-medium',
            met ? 'text-success' : 'text-muted-foreground'
          )}
        >
          {met ? <Check className="h-3.5 w-3.5" /> : null}
          {met
            ? 'Mínimo atingido'
            : `Mínimo de ${DESCRIPTION_MIN_LENGTH} caracteres (${length}/${DESCRIPTION_MIN_LENGTH})`}
        </span>
      </div>

      <StepHint tone="tip">
        Evite “faço de tudo”. Ser específico sobre o que você faz bem passa mais confiança e atrai o
        cliente certo.
      </StepHint>

      {stacked ? null : (
        <ServiceConfigSummary
          groupName={selectedGroup?.name}
          categoryName={selectedCategory?.name}
          subcategoryNames={selectedSubcategoryNames}
          title={state.title}
          serviceLocation={state.serviceLocation}
          startingPrice={state.startingPrice}
          priceUnit={state.priceUnit}
          imageIds={state.imageIds}
        />
      )}
    </div>
  );
}
