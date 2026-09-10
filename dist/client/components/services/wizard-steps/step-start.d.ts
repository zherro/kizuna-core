import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
/**
 * Passo 1 do wizard — "Início". Só o nome/título do serviço. O antigo atalho da Naví virou
 * responsabilidade do engine: quando `assist` está disponível, o `Wizard` renderiza o próprio
 * botão "Preencher com IA" no header — este passo só mostra o campo de texto e os exemplos.
 */
export declare function StepStart({ state, patch }: WizardStepProps<ServiceWizardState>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=step-start.d.ts.map