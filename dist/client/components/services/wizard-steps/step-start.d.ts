import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
/**
 * Passo 1 do wizard — "Início". Só o nome/título do serviço. O antigo atalho da Naví virou
 * responsabilidade do engine: quando `assist` está disponível, o `Wizard` renderiza o próprio
 * botão "Preencher com IA" no header. Os exemplos estáticos saíram daqui — a Naví conversacional
 * já sugere títulos personalizados no lugar (ver `use-navi-conversation.ts`).
 */
export declare function StepStart({ state, patch }: WizardStepProps<ServiceWizardState>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=step-start.d.ts.map