import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
/**
 * Passo só de `mode === 'review'` (o engine decide `mode`; o gate de permissão fica na página).
 * Config-driven via `DynamicStepForm`. O `persist` do registry chama `moderateService(...)`.
 * "Motivo da rejeicao" sempre renderiza (o engine não tem campo condicional); só vai pro RPC
 * quando `decision === 'rejected'`.
 */
export declare function StepModeration({ state, patch }: WizardStepProps<ServiceWizardState>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=step-moderation.d.ts.map