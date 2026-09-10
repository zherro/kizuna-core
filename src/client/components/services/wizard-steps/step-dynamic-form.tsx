'use client';

import { useEffect, useRef } from 'react';
import { DynamicFormStep, type DynamicFormStepHandle } from '../../forms';
import type { WizardStepContext, WizardStepProps } from '../../wizard/types';
import type { ServiceCategory, ServiceWizardState } from '../service-type';

/** Shared holder the step writes its imperative handle into so the registry `persist` (which
 * only sees `ctx`) can reach it. Lazily created on `entities`. */
type DynamicFormHolder = { current: DynamicFormStepHandle | null };

export function getDynamicFormHolder(ctx: WizardStepContext<ServiceWizardState>): DynamicFormHolder {
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
  const { patch, resourceId } = props;
  const localRef = useRef<DynamicFormStepHandle>(null);
  const category = dynamicFormCategory(props);
  const formKey = String(category?.formKey ?? '').trim();

  const holder = getDynamicFormHolder(props);
  useEffect(() => {
    holder.current = localRef.current;
    return () => {
      holder.current = null;
    };
  });

  if (!formKey || resourceId == null) return null;

  return (
    <DynamicFormStep
      ref={localRef}
      formKey={formKey}
      domain="service"
      referenceId={String(resourceId)}
      onValidChange={(valid) => patch({ dynamicFormValid: valid })}
    />
  );
}
