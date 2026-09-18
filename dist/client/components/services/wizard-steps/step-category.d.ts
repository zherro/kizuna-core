import type { WizardStepProps } from '../../wizard/types';
import { type ServiceWizardState } from '../service-type';
/**
 * Passo 2 do wizard. Escolha da ÁREA (grupo) — sempre a partir do grupo, que é mais amplo.
 * Selecionar a área abre o CategoryPickerModal. As especialidades ficam nesta tela, depois da
 * categoria.
 *
 * Fluxo (também vale quando é a Naví conversacional que decide grupo/categoria, não só clique):
 *  - grupo definido e categoria ainda vazia → abre o modal de categoria sozinho;
 *  - categoria definida → fecha o modal e rola até as tags de especialidade;
 *  - categoria definida mas nenhuma especialidade marcada ainda → esconde a Naví (se a categoria
 *    tem especialidades cadastradas) pra obrigar a escolha manual das tags, sem competir com o
 *    chat. Volta a aparecer assim que a 1ª tag é marcada.
 *  - reclicar o mesmo card (ou revisitar em edição) NÃO apaga a categoria/especialidades já
 *    carregadas — o reset de campos dependentes só acontece quando o valor realmente muda.
 */
export declare function StepCategory(props: WizardStepProps<ServiceWizardState>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=step-category.d.ts.map