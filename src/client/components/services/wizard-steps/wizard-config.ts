import type { WizardJsonConfig } from '../../wizard/from-config';
import type { LocationProfile } from './location-options';
import type { PriceProfile } from './price-options';
import type { DynamicFormProfile } from './step-dynamic-form';
import type { ImagesProfile } from './step-images';
import type { StepProfiles } from './step-profiles';

/**
 * Entrada `wizards.servicos` do `kizuna.config.json`: o `WizardJsonConfig` genérico mais o que é
 * específico de serviços. Tudo é opcional — sem nada, valem os padrões do core.
 */
export type ServiceWizardJsonConfig = WizardJsonConfig & {
  /**
   * Perfis por passo, no mesmo formato para todos (`StepProfiles`):
   * `{ default, byGroup: { "<slug>": … }, byCategory: { "<slug>": … } }`.
   * Precedência: categoria → grupo → `default` → padrão do core.
   */
  stepProfiles?: {
    location?: StepProfiles<LocationProfile>;
    price?: StepProfiles<PriceProfile>;
    images?: StepProfiles<ImagesProfile>;
    'dynamic-form'?: StepProfiles<DynamicFormProfile>;
  };
  /** Passos que NÃO aparecem pra certos grupos de categorias: `{ "location": ["slug-do-grupo"] }`.
   * Vale pelo slug do grupo escolhido; sem grupo escolhido ainda o passo aparece. Serve pra
   * qualquer passo. */
  skipStepsByGroup?: Record<string, string[]>;
  /** Nome do passo no stepper por grupo/categoria: `{ "dynamic-form": { byGroup: { "eventos":
   * "Detalhes do evento" } } }` (mesmo formato/precedência de `stepProfiles`). Sem entrada, fica o
   * nome padrão. */
  stepLabels?: Record<string, StepProfiles<string>>;
  /**
   * Onde o usuário pode CRIAR anúncio (só o wizard; busca/detalhe não mudam). `groups` libera o
   * grupo inteiro (slug do grupo); `categories` libera só aquela categoria (slug). Root vê tudo e,
   * em edição, o grupo/categoria já gravados continuam visíveis. Sem a chave, tudo liberado.
   */
  creatable?: ServiceCreatableConfig;
};

export type ServiceCreatableConfig = { groups?: string[]; categories?: string[] };
