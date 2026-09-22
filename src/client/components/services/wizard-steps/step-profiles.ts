import type { WizardEntities } from '../../wizard/types';
import type { ServiceCategory, ServiceGroup, ServiceWizardState } from '../service-type';

/**
 * Formato padrão de configuração de um passo do wizard de serviços — o mesmo para `location`,
 * `price` e qualquer passo futuro; só o conteúdo do perfil `P` muda (lista de atributos).
 *
 * Precedência (o perfil escolhido substitui INTEIRO o anterior, sem merge):
 *   categoria → grupo → `default` (custom global do projeto) → padrão do core.
 * As chaves de `byGroup`/`byCategory` são slugs.
 */
export type StepProfiles<P> = {
  /** Custom global do projeto — vale quando nenhum grupo/categoria específico bate. */
  default?: P;
  byGroup?: Record<string, P>;
  byCategory?: Record<string, P>;
};

export function resolveStepProfile<P>(
  coreDefault: P,
  profiles: StepProfiles<P> | undefined,
  entities: WizardEntities,
  state: Pick<ServiceWizardState, 'groupId' | 'categoryId'>
): P {
  if (!profiles) return coreDefault;
  const categories = (entities.categories as ServiceCategory[] | undefined) ?? [];
  const groups = (entities.groups as ServiceGroup[] | undefined) ?? [];
  const category = state.categoryId
    ? categories.find((c) => String(c.id) === String(state.categoryId))
    : undefined;
  const group = state.groupId
    ? groups.find((g) => String(g.id) === String(state.groupId))
    : undefined;
  return (
    (category && profiles.byCategory?.[category.slug]) ||
    (group && profiles.byGroup?.[group.slug]) ||
    profiles.default ||
    coreDefault
  );
}

/** Todos os perfis de um `StepProfiles` (pra validar). */
export function allProfiles<P>(profiles: StepProfiles<P> | undefined): P[] {
  if (!profiles) return [];
  return [
    ...(profiles.default ? [profiles.default] : []),
    ...Object.values(profiles.byGroup ?? {}),
    ...Object.values(profiles.byCategory ?? {}),
  ];
}
