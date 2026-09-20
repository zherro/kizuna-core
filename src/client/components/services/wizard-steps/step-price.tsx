'use client';

import { useAppPreferences } from '../../../providers/app-preferences-provider';
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
  const { messages } = useAppPreferences();
  const t = messages.wizard;

  return (
    <div className="space-y-6">
      <StepHeader
        title={t.price.title}
        subtitle={t.price.subtitle}
        why={t.price.why}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t.price.unitLabel}</p>
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
          {isQuote ? t.price.amountOptional : t.price.amount}
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
            {t.price.quoteHint}
          </StepHint>
        ) : null}
      </div>
    </div>
  );
}
