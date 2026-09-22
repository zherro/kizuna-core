import type { WizardStep, WizardStepContext } from '../../wizard/types';
import type { ServiceGroup, ServiceWizardState } from '../service-type';
import { validateLocationProfile } from './location-options';
import { validatePriceProfile } from './price-options';
import { createLocationStep } from './step-location';
import { createPriceStep } from './step-price';
import { allProfiles } from './step-profiles';
import type { ServiceWizardJsonConfig } from './wizard-config';

/**
 * Registry do wizard de serviços ajustado pela config do projeto (`kizuna.config.json`):
 *  - `stepProfiles.<passo>` troca o conteúdo de um passo com perfis (`location`, `price`), no
 *    formato único `{ default, byGroup, byCategory }` — categoria → grupo → default → core;
 *  - `skipStepsByGroup` esconde qualquer passo para certos grupos (pelo slug do grupo).
 * Sem nada disso, devolve o próprio `base`. Os dados gravados não mudam (mesmas colunas/enums).
 */
export function buildServiceWizardRegistry(
  base: Record<string, WizardStep<ServiceWizardState>>,
  json: ServiceWizardJsonConfig
): Record<string, WizardStep<ServiceWizardState>> {
  const profiles = json.stepProfiles ?? {};
  for (const profile of allProfiles(profiles.location)) validateLocationProfile(profile);
  for (const profile of allProfiles(profiles.price)) validatePriceProfile(profile);

  const skip = json.skipStepsByGroup ?? {};
  const unknown = Object.keys(skip).filter((key) => !(key in base));
  if (unknown.length) {
    throw new Error(`skipStepsByGroup: step(s) fora do registry: ${unknown.join(', ')}`);
  }
  if (!profiles.location && !profiles.price && Object.keys(skip).length === 0) return base;

  const registry = { ...base };
  if (profiles.location) registry.location = createLocationStep(profiles.location);
  if (profiles.price) registry.price = createPriceStep(profiles.price);

  for (const [key, slugs] of Object.entries(skip)) {
    const step = registry[key];
    const originalEnabled = step.enabled;
    registry[key] = {
      ...step,
      enabled: (ctx: WizardStepContext<ServiceWizardState>) => {
        const groups = (ctx.entities.groups as ServiceGroup[] | undefined) ?? [];
        const group = groups.find((g) => String(g.id) === String(ctx.state.groupId));
        if (group && slugs.includes(group.slug)) return false;
        if (originalEnabled === undefined) return true;
        return typeof originalEnabled === 'function' ? originalEnabled(ctx) : originalEnabled;
      },
    };
  }
  return registry;
}
