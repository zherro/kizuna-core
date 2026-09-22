'use client';

import { useEffect, useState } from 'react';
import { useAppPreferences } from '../../../providers/app-preferences-provider';
import { Button } from '../../ui/button';
import { CurrencyInput } from '../../ui/currency-input';
import type { WizardEntities, WizardStep, WizardStepProps } from '../../wizard/types';
import { PRICE_UNIT_LABEL } from '../service-labels';
import {
  SERVICE_PRICE_UNIT_OPTIONS,
  defaultPriceUnitForCategory,
  type ServiceCategory,
  type ServiceWizardState,
} from '../service-type';
import {
  DEFAULT_PRICE_PROFILE,
  cleanPriceTable,
  resolvePriceTable,
  type PriceProfile,
} from './price-options';
import { PriceTableEditor, type PriceTableLabels } from './price-table-editor';
import { resolveStepProfile, type StepProfiles } from './step-profiles';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

type PriceOptionMessages = Record<string, { title?: string; description?: string } | undefined>;

/** Perfil que vale agora: categoria → grupo → custom global → padrão do core. */
export function resolvePriceProfile(
  profiles: StepProfiles<PriceProfile> | undefined,
  entities: WizardEntities,
  state: Pick<ServiceWizardState, 'groupId' | 'categoryId'>
): PriceProfile {
  return resolveStepProfile(DEFAULT_PRICE_PROFILE, profiles, entities, state);
}

/**
 * Passo 4 — forma de cobrança + valor a partir de + (opcional) tabela de preços. O valor é
 * opcional ('sob orçamento' + R$ 0 é válido); a forma de cobrança precisa estar escolhida.
 *
 * O perfil (`stepProfiles.price`) define quais formas de cobrança aparecem, se mostra o "a partir
 * de" e se mostra a tabela. Título/descrição de cada forma vêm de
 * `messages.wizard.price.options[textKey ?? value]`, com fallback nos textos padrão. O que vai
 * pro banco não muda: `price_unit`/`starting_price` nas colunas, a tabela em `extras.priceTable`.
 */
export function createStepPrice(profiles?: StepProfiles<PriceProfile>) {
  return function StepPrice({
    state,
    patch,
    entities,
    touched,
    mode,
  }: WizardStepProps<ServiceWizardState>) {
    const profile = resolvePriceProfile(profiles, entities, state);
    const showAmount = profile.startingPrice !== false;
    const table = resolvePriceTable(profile);
    const startingPrice = state.startingPrice ?? 0;
    const priceUnit = state.priceUnit ?? '';
    // "A combinar": sem valor fixo — desabilita o campo (o valor gravado fica 0). Começa ligado
    // quando ainda não há valor.
    const [toAgree, setToAgree] = useState(() => (state.startingPrice ?? 0) === 0);
    const isQuote = priceUnit === 'quote';
    const { messages } = useAppPreferences();
    const t = messages.wizard;
    const optionMessages = (t.price as { options?: PriceOptionMessages }).options ?? {};
    const tableLabels = (t.price as { table?: PriceTableLabels }).table;

    // Default do perfil: `defaultValue`, senão (padrão do core) o default por categoria; sem
    // nenhum dos dois, nada vem selecionado. Só entra se for uma das opções do perfil.
    const category = (entities.categories as ServiceCategory[] | undefined)?.find(
      (c) => String(c.id) === String(state.categoryId)
    );
    const wanted =
      profile.defaultValue ??
      (profile.defaultByCategory ? defaultPriceUnitForCategory(category?.slug) : '');
    const initial = profile.options.some((option) => option.value === wanted) ? wanted : '';

    // 1) Criando e o usuário ainda não escolheu → aplica o default (ou deixa vazio).
    // 2) Valor fora das opções do perfil (trocou de grupo/categoria) → volta ao default/vazio.
    //    Em edição não mexe: um serviço antigo pode ter uma forma de cobrança fora do perfil.
    useEffect(() => {
      if (mode !== 'create') return;
      const known = profile.options.some((option) => option.value === priceUnit);
      if (!touched.has('priceUnit') ? priceUnit !== initial : priceUnit && !known) {
        patch({ priceUnit: initial });
      }
    }, [mode, touched, priceUnit, initial, profile.options, patch]);

    return (
      <div className="space-y-6">
        <StepHeader title={t.price.title} subtitle={t.price.subtitle} why={t.price.why} />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t.price.unitLabel}</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {profile.options.map((option) => {
              const active = priceUnit === option.value;
              const curated = SERVICE_PRICE_UNIT_OPTIONS.find((o) => o.value === option.value);
              const custom = optionMessages[option.textKey ?? option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => patch({ priceUnit: option.value })}
                  data-active={active}
                  className="wz-selectable rounded-xl border bg-background p-3.5 text-left"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {custom?.title ?? curated?.label ?? PRICE_UNIT_LABEL[option.value]}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {custom?.description ?? curated?.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {showAmount ? (
          <div className="space-y-1.5">
            <label htmlFor="starting-price" className="block text-sm font-medium text-foreground">
              {isQuote ? t.price.amountOptional : t.price.amount}
            </label>
            <div className="flex max-w-md gap-2">
              <CurrencyInput
                id="starting-price"
                value={toAgree ? 0 : startingPrice}
                onValueChange={(value) => patch({ startingPrice: value })}
                disabled={toAgree}
                className="h-12 text-base"
              />
              <Button
                type="button"
                variant={toAgree ? 'default' : 'outline'}
                aria-pressed={toAgree}
                className="h-12 shrink-0"
                onClick={() => {
                  const next = !toAgree;
                  setToAgree(next);
                  if (next) patch({ startingPrice: 0 });
                }}
              >
                {t.price.agree}
              </Button>
            </div>
            {isQuote ? <StepHint tone="info">{t.price.quoteHint}</StepHint> : null}
          </div>
        ) : null}

        {table ? (
          <PriceTableEditor
            rows={state.priceTable ?? []}
            onChange={(rows) => patch({ priceTable: rows })}
            fields={table.fields}
            maxRows={table.maxRows}
            labels={tableLabels}
          />
        ) : null}
      </div>
    );
  };
}

/** Passo `price` pronto pro registry, com os perfis dados (padrão: o do core). */
export function createPriceStep(
  profiles?: StepProfiles<PriceProfile>
): WizardStep<ServiceWizardState> {
  return {
    key: 'price',
    label: 'Quanto você cobra',
    Component: createStepPrice(profiles),
    // Com forma de cobrança padrão sempre há uma selecionada; num perfil sem default o usuário
    // precisa escolher uma (nada vem selecionado).
    canContinue: (ctx) => Boolean(ctx.state.priceUnit),
    persist: async (ctx) => {
      const profile = resolvePriceProfile(profiles, ctx.entities, ctx.state);
      await ctx.persist({
        startingPrice: profile.startingPrice === false ? 0 : ctx.state.startingPrice,
        ...(ctx.state.priceUnit ? { priceUnit: ctx.state.priceUnit } : {}),
      });
      // A tabela vive no jsonb `extras` (read-merge-write) — o resto de `extras` é preservado.
      if (resolvePriceTable(profile)) {
        await ctx.persistExtras({ priceTable: cleanPriceTable(ctx.state.priceTable) });
      }
    },
  };
}

/** Componente padrão (mantido pra quem importa `StepPrice` direto). */
export const StepPrice = createStepPrice();
