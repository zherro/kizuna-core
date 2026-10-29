'use client';

import { useEffect, useRef } from 'react';
import { DynamicFormStep, type DynamicFormStepHandle } from '../../forms';
import type { WizardStep, WizardStepContext, WizardStepProps } from '../../wizard/types';
import type { ServiceCategory, ServiceWizardState } from '../service-type';
import {
  ExpiresAtField,
  resolveExpiresAtLabels,
  type ExpiresAtLabels,
} from './expires-at-field';
import { expiresAtCheckPast, resolveExpiresAtMode, validateExpiresAt } from './price-options';
import { resolveStepProfile, type StepProfiles } from './step-profiles';

/** Shared holder the step writes its imperative handle into so the registry `persist` (which
 * only sees `ctx`) can reach it. Lazily created on `entities`. */
type DynamicFormHolder = { current: DynamicFormStepHandle | null };

export function getDynamicFormHolder(
  ctx: WizardStepContext<ServiceWizardState>
): DynamicFormHolder {
  const entities = ctx.entities as Record<string, unknown>;
  if (!entities.dynamicFormRef) entities.dynamicFormRef = { current: null };
  return entities.dynamicFormRef as DynamicFormHolder;
}

export function dynamicFormCategory(
  ctx: WizardStepContext<ServiceWizardState>
): ServiceCategory | undefined {
  const categories = (ctx.entities.categories as ServiceCategory[] | undefined) ?? [];
  return categories.find((c) => String(c.id) === String(ctx.state.categoryId));
}

/**
 * Passo dinâmico por categoria (plugin `forms`). Só aparece quando a categoria escolhida tem
 * `formKey` E o `services` já existe (precisa de `referenceId`). Envolve o `DynamicFormStep`
 * (handle imperativo): guarda o handle no holder de `entities` pro `persist` do registry, e
 * reporta validade via `patch({ dynamicFormValid })`.
 */
export function StepDynamicForm(props: WizardStepProps<ServiceWizardState>) {
  const { patch, resourceId, state } = props;
  const localRef = useRef<DynamicFormStepHandle>(null);
  const category = dynamicFormCategory(props);
  const formKey = String(category?.formKey ?? '').trim();

  const holder = getDynamicFormHolder(props);
  // O handle do filho é recriado a cada mudança das respostas, mas este componente não
  // re-renderiza junto: guardar `localRef.current` aqui deixava o registry com as respostas
  // do primeiro render (`{}`). O holder repassa sempre para o handle atual.
  useEffect(() => {
    holder.current = {
      persist: async () => (await localRef.current?.persist()) ?? false,
      getValues: () => localRef.current?.getValues() ?? {},
    };
    return () => {
      holder.current = null;
    };
  }, [holder]);

  if (!formKey || resourceId == null) return null;

  return (
    <DynamicFormStep
      ref={localRef}
      formKey={formKey}
      domain="service"
      referenceId={String(resourceId)}
      fallbackValues={state.formFallback}
      onValidChange={(valid) => patch({ dynamicFormValid: valid })}
    />
  );
}

/**
 * Perfil do passo `dynamic-form` (ver `StepProfiles`). Hoje só configura a validade do anúncio
 * (`services.expires_at`), mostrada no TOPO do passo — ex.: "Acontece em" nos eventos.
 */
export type DynamicFormProfile = {
  /** Ausente/`false` = campo oculto; `true` = `'optional'`; `'required'` exige data futura. */
  expiresAt?: false | true | 'optional' | 'required';
  /** Textos do campo (`label`, `hint`, `optional`, `clear`, `required`, `past`); o que faltar
   * cai nos padrões do core ("Válido até"…). */
  expiresAtLabels?: ExpiresAtLabels;
};

export function validateDynamicFormProfile(profile: DynamicFormProfile) {
  const v = profile?.expiresAt as unknown;
  if (v !== undefined && v !== true && v !== false && v !== 'optional' && v !== 'required') {
    throw new Error(
      `stepProfiles.dynamic-form: expiresAt inválido "${String(v)}" (use true, false, 'optional' ou 'required')`
    );
  }
}

const NO_PROFILE: DynamicFormProfile = {};

function expiresModeOf(
  profiles: StepProfiles<DynamicFormProfile> | undefined,
  ctx: WizardStepContext<ServiceWizardState>
) {
  const profile = resolveStepProfile(NO_PROFILE, profiles, ctx.entities, ctx.state);
  return { profile, mode: resolveExpiresAtMode(profile) };
}

/** Passo `dynamic-form` pronto pro registry, com os perfis dados (padrão: sem campo de validade). */
export function createDynamicFormStep(
  profiles?: StepProfiles<DynamicFormProfile>
): WizardStep<ServiceWizardState> {
  function Step(props: WizardStepProps<ServiceWizardState>) {
    const { state, patch, touched, mode: wizardMode } = props;
    const { profile, mode } = expiresModeOf(profiles, props);
    const labels = resolveExpiresAtLabels(profile.expiresAtLabels);
    const error = touched.has('expiresAt')
      ? validateExpiresAt(mode, state.expiresAt, expiresAtCheckPast(wizardMode, touched))
      : null;
    return (
      <div className="space-y-6">
        {mode !== 'hidden' ? (
          <ExpiresAtField
            id="expires-at"
            mode={mode}
            value={state.expiresAt}
            error={error}
            labels={labels}
            onChange={(expiresAt) => patch({ expiresAt })}
          />
        ) : null}
        <StepDynamicForm {...props} />
      </div>
    );
  }

  return {
    key: 'dynamic-form',
    label: 'Formulário',
    Component: Step,
    enabled: (ctx) => {
      const cat = dynamicFormCategory(ctx);
      return Boolean(String(cat?.formKey ?? '').trim()) && ctx.resourceId != null;
    },
    canContinue: (ctx) => {
      if (ctx.state.dynamicFormValid === false) return false;
      const { mode } = expiresModeOf(profiles, ctx);
      return !validateExpiresAt(
        mode,
        ctx.state.expiresAt,
        expiresAtCheckPast(ctx.mode, ctx.touched)
      );
    },
    persist: async (ctx) => {
      const { mode } = expiresModeOf(profiles, ctx);
      // Oculto: não manda a chave — o baseline (registro carregado) já carrega o valor atual.
      if (mode !== 'hidden') await ctx.persist({ expiresAt: ctx.state.expiresAt ?? null });
      const ok = (await getDynamicFormHolder(ctx).current?.persist()) ?? false;
      if (!ok) throw new Error('Nao foi possivel salvar as respostas do formulario.');
    },
  };
}
