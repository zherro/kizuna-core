'use client';

import { Input } from '../../ui/input';
import type { WizardStepProps } from '../../wizard/types';
import { SERVICE_PRICE_UNIT_OPTIONS, type ServiceWizardState } from '../service-type';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

/** Passo 4 — valor a partir de + forma de cobrança. Ambos opcionais ('sob orçamento' + R$ 0 é
 * válido), então `canContinue` deste passo é sempre `true`. */
export function StepPrice({ state, patch }: WizardStepProps<ServiceWizardState>) {
  const startingPrice = state.startingPrice ?? 0;
  const priceUnit = state.priceUnit ?? 'quote';
  const isQuote = priceUnit === 'quote';

  return (
    <div className="space-y-6">
      <StepHeader
        title="Quanto você cobra?"
        subtitle="Um valor de referência ajuda o cliente a decidir antes de te chamar. Não precisa ser o preço final — é o 'a partir de'."
        why="Anúncios com um valor de referência recebem contatos mais sérios: quem chama já sabe a ordem de grandeza. Se o seu preço depende muito de cada caso, escolha 'sob orçamento' e combine o resto no chat."
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Como você cobra?</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SERVICE_PRICE_UNIT_OPTIONS.map((option) => {
            const active = priceUnit === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => patch({ priceUnit: option.value })}
                data-active={active}
                className="wz-selectable rounded-xl border bg-background p-3.5 text-left"
              >
                <div className="text-sm font-semibold text-foreground">{option.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{option.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="starting-price" className="block text-sm font-medium text-foreground">
          Valor a partir de {isQuote ? '(opcional)' : '(R$)'}
        </label>
        <Input
          id="starting-price"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={startingPrice || ''}
          onChange={(event) => patch({ startingPrice: Number(event.target.value) || 0 })}
          placeholder="0,00"
          className="h-12 max-w-[12rem] text-base"
        />
        {isQuote ? (
          <StepHint tone="info">
            Com “sob orçamento” você pode deixar em branco. Se preencher, o cliente vê “a partir de
            R$ X”.
          </StepHint>
        ) : null}
      </div>
    </div>
  );
}
