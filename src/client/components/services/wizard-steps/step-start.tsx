'use client';

import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
import { StepHeader } from './step-header';

/**
 * Passo 1 do wizard — "Início". Só o nome/título do serviço. O antigo atalho da Naví virou
 * responsabilidade do engine: quando `assist` está disponível, o `Wizard` renderiza o próprio
 * botão "Preencher com IA" no header. Os exemplos estáticos saíram daqui — a Naví conversacional
 * já sugere títulos personalizados no lugar (ver `use-navi-conversation.ts`).
 */
export function StepStart({ state, patch }: WizardStepProps<ServiceWizardState>) {
  const title = state.title ?? '';
  const handleChange = (value: string) => patch({ title: value.slice(0, 120) });

  return (
    <div className="space-y-6">
      <StepHeader
        title="Digite o título do seu anúncio"
        subtitle="Curto e direto: o serviço que você faz e, se ajudar, um diferencial."
      />

      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Ex.: Eletricista residencial, atendo emergência 24h"
          className="h-11 w-full rounded-lg border bg-background px-3.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
        />

        {title.trim().length > 0 && title.trim().length < 5 ? (
          <p className="text-xs text-muted-foreground">
            Escreva um pouco mais (mínimo 5 caracteres).
          </p>
        ) : null}
      </div>
    </div>
  );
}
