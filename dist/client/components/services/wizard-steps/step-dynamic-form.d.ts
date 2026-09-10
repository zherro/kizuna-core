import { type DynamicFormStepHandle } from '../../forms';
import type { WizardStepContext, WizardStepProps } from '../../wizard/types';
import type { ServiceCategory, ServiceWizardState } from '../service-type';
/** Shared holder the step writes its imperative handle into so the registry `persist` (which
 * only sees `ctx`) can reach it. Lazily created on `entities`. */
type DynamicFormHolder = {
    current: DynamicFormStepHandle | null;
};
export declare function getDynamicFormHolder(ctx: WizardStepContext<ServiceWizardState>): DynamicFormHolder;
export declare function dynamicFormCategory(ctx: WizardStepContext<ServiceWizardState>): ServiceCategory | undefined;
/**
 * Passo dinâmico por categoria (plugin `forms`). Só aparece quando a categoria escolhida tem
 * `formKey` E o `services` já existe (precisa de `referenceId`). Envolve o `DynamicFormStep`
 * (handle imperativo): guarda o handle no holder de `entities` pro `persist` do registry, e
 * reporta validade via `patch({ dynamicFormValid })`.
 */
export declare function StepDynamicForm(props: WizardStepProps<ServiceWizardState>): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=step-dynamic-form.d.ts.map