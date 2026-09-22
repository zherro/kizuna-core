import type { WizardJsonConfig } from '../../wizard/from-config';
import type { LocationProfile } from './location-options';
import type { PriceProfile } from './price-options';
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
  };
  /** Passos que NÃO aparecem pra certos grupos de categorias: `{ "location": ["slug-do-grupo"] }`.
   * Vale pelo slug do grupo escolhido; sem grupo escolhido ainda o passo aparece. Serve pra
   * qualquer passo. */
  skipStepsByGroup?: Record<string, string[]>;
};
