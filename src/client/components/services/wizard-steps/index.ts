import type { WizardStep, WizardStepContext } from '../../wizard/types';
import {
  stripHtml,
  type ServiceCategory,
  type ServiceSubcategory,
  type ServiceSubcategoryLink,
  type ServiceWizardState,
} from '../service-type';
import { StepStart } from './step-start';
import { StepCategory } from './step-category';
import { createLocationStep } from './step-location';
import { createPriceStep } from './step-price';
import { createImagesStep } from './step-images';
import { StepDescription } from './step-description';
import { createDynamicFormStep } from './step-dynamic-form';
import { StepModeration } from './step-moderation';
import { linksStep } from './step-links';
import { syncServiceSubcategories } from './sync-service-subcategories';
import { moderateService } from './moderate-service';

const DESCRIPTION_MIN_LENGTH = 20;

/**
 * The 8 domain steps of the `services` wizard, as ready-made `WizardStep` objects. Consuming
 * apps pass this as the `Wizard` config `registry` and list the keys in `steps`.
 *
 * `step-images` renders the core `ImageGalleryManager` directly; its `onPersist` (via
 * `ctx.persistExtras`) writes `extras.images` / `extras.coverFileId`.
 */
/**
 * Salva título + categoria (+ especialidades). A ordem dos passos é dinâmica, então quem chama
 * (`start` e `category`) sempre passa por aqui e a regra fica num lugar só: SEM título não salva
 * nada. Em `create` a linha `services` só nasce com título E categoria (as duas colunas são
 * NOT NULL) — o passo que completar o par é quem cria; o outro só espera.
 */
async function saveTitleAndCategory(ctx: WizardStepContext<ServiceWizardState>): Promise<void> {
  const { title, groupId, categoryId, subcategoryIds } = ctx.state;
  if (!(title ?? '').trim()) return;
  if (ctx.mode === 'create' && !categoryId) return;

  const r = await ctx.persist({
    title,
    ...(categoryId ? { categoryGroupId: groupId, categoryId } : {}),
  });
  if (!r.ok || !r.item) throw new Error('Nao foi possivel salvar o servico.');
  if (!categoryId) return;

  const serviceId = String(r.item.id);
  const prevLinks =
    (ctx.entities.serviceSubcategoryLinks as ServiceSubcategoryLink[] | undefined) ?? [];
  const next = await syncServiceSubcategories(
    serviceId,
    groupId,
    categoryId,
    subcategoryIds,
    prevLinks
  );
  (ctx.entities as Record<string, unknown>).serviceSubcategoryLinks = next;
}

export const SERVICE_WIZARD_STEPS: Record<string, WizardStep<ServiceWizardState>> = {
  start: {
    key: 'start',
    label: 'Início',
    Component: StepStart,
    assist: true,
    // Clicar num título sugerido pela Naví já é a resposta definitiva (não uma "tag" de
    // múltipla escolha) — aplica e avança num clique só, sem esperar um "Pode seguir" à parte.
    conversationQuickConfirm: true,
    canContinue: (ctx) => (ctx.state.title ?? '').trim().length >= 5,
    // O título é sempre obrigatório ao chegar neste passo, em qualquer posição da ordem.
    required: true,
    persist: saveTitleAndCategory,
  },

  category: {
    key: 'category',
    label: 'Categoria',
    Component: StepCategory,
    // Escolher a categoria não basta — se ela tem especialidades cadastradas, exige marcar ao
    // menos uma antes de liberar o avanço; sem isto o auto-reveal do layout "Questionário"
    // disparava assim que a categoria era escolhida, sem dar tempo de marcar as tags de
    // especialidade que aparecem logo abaixo, no mesmo passo.
    canContinue: (ctx) => {
      const { groupId, categoryId, subcategoryIds } = ctx.state;
      if (!groupId || !categoryId) return false;
      const subcategories = (ctx.entities.subcategories as ServiceSubcategory[] | undefined) ?? [];
      const hasSubcategories = subcategories.some(
        (s) => String(s.categoryId) === String(categoryId)
      );
      return hasSubcategories ? (subcategoryIds ?? []).length > 0 : true;
    },
    // Sem título ainda (ordem dinâmica) → não salva; o passo do título cria a linha depois.
    persist: saveTitleAndCategory,
  },

  // Padrão do core; o projeto troca as opções via `locationOptions` (ver build-registry.ts).
  location: createLocationStep(),

  // Padrão do core; o projeto troca o perfil via `stepProfiles.price` (ver build-registry.ts).
  price: createPriceStep(),

  // Padrão do core (até 3 fotos); o projeto troca via `stepProfiles.images` (ver build-registry.ts).
  images: createImagesStep(),

  description: {
    key: 'description',
    label: 'Descrição',
    Component: StepDescription,
    canContinue: (ctx) => stripHtml(ctx.state.description ?? '').length >= DESCRIPTION_MIN_LENGTH,
    persist: async (ctx) => {
      await ctx.persist({ description: ctx.state.description });
    },
  },

  // Padrão do core (sem validade); o projeto liga via `stepProfiles.dynamic-form` (ver build-registry.ts).
  'dynamic-form': createDynamicFormStep(),

  // Opcional e só com a permissão `services.link` (ver step-links.tsx).
  links: linksStep,

  moderation: {
    key: 'moderation',
    label: 'Status',
    Component: StepModeration,
    enabled: (ctx) => ctx.mode === 'review',
    canContinue: (ctx) => Boolean(ctx.state.decision),
    persist: async (ctx) => {
      const serviceId = ctx.resourceId;
      if (serviceId == null) throw new Error('Servico sem id para moderar.');
      await moderateService({
        serviceId,
        decision: ctx.state.decision,
        note: ctx.state.decisionNote,
        rejectionReason: ctx.state.rejectionReason,
      });
    },
  },
};

export { StepStart } from './step-start';
export { StepCategory } from './step-category';
export { StepLocation } from './step-location';
export { StepPrice } from './step-price';
export { StepImages, createImagesStep, createStepImages, DEFAULT_MAX_SERVICE_IMAGES, type ImagesProfile } from './step-images';
export { StepDescription } from './step-description';
export {
  StepDynamicForm,
  createDynamicFormStep,
  type DynamicFormProfile,
} from './step-dynamic-form';
export { StepModeration } from './step-moderation';
export { StepLinks } from './step-links';
export { moderateService, type ModerateServiceArgs } from './moderate-service';
export { syncServiceSubcategories } from './sync-service-subcategories';
