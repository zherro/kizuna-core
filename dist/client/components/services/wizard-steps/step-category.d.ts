import type { WizardStepProps } from '../../wizard/types';
import { type ServiceWizardState } from '../service-type';
/**
 * Passo 2 do wizard. Escolha da ÁREA (grupo) — sempre a partir do grupo, que é mais amplo.
 * Selecionar a área abre o CategoryPickerModal. As especialidades ficam nesta tela, depois da
 * categoria.
 *
 * Comportamento preservado do wizard antigo (.claude/domains/services.md §Navigation):
 *  - modal abre sozinho ao entrar no passo quando já há `groupId` e ainda não há `categoryId`;
 *  - reclicar o mesmo card (ou revisitar em edição) NÃO apaga a categoria/especialidades já
 *    carregadas — o reset de campos dependentes só acontece quando o valor realmente muda.
 */
export declare function StepCategory(props: WizardStepProps<ServiceWizardState>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=step-category.d.ts.map