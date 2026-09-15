import type { WizardStep } from '../../wizard/types';
import {
  stripHtml,
  type ServiceCategory,
  type ServiceSubcategory,
  type ServiceSubcategoryLink,
  type ServiceWizardState,
} from '../service-type';
import { StepStart } from './step-start';
import { StepCategory } from './step-category';
import { StepLocation } from './step-location';
import { StepPrice } from './step-price';
import { StepImages } from './step-images';
import { StepDescription } from './step-description';
import { StepDynamicForm, dynamicFormCategory, getDynamicFormHolder } from './step-dynamic-form';
import { StepModeration } from './step-moderation';
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
    persist: async (ctx) => {
      // In create mode the row is born in the `category` step — nothing to save here.
      if (ctx.mode === 'create') return;
      await ctx.persist({ title: ctx.state.title });
    },
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
    persist: async (ctx) => {
      const { title, groupId, categoryId, subcategoryIds } = ctx.state;
      // This CREATES the `services` row (or updates it) with title + category.
      const r = await ctx.persist({
        title,
        categoryGroupId: groupId,
        categoryId,
      });
      if (!r.ok || !r.item) throw new Error('Nao foi possivel salvar o servico.');
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
    },
  },

  location: {
    key: 'location',
    label: 'Onde você atende',
    Component: StepLocation,
    // Presencial ("no cliente"/"no estabelecimento") exige o endereço de referência preenchido —
    // só em `create`: em `edit`/`review` o endereço nunca foi persistido (é local-only, ver
    // `StepLocation`), então não há o que validar e barrar aqui só travaria quem está editando
    // outra coisa no anúncio.
    canContinue: (ctx) => {
      const loc = ctx.state.serviceLocation;
      if (!loc) return false;
      const isPresential = loc === 'no_cliente' || loc === 'no_estabelecimento';
      if (!isPresential || ctx.mode !== 'create') return true;
      return Boolean(ctx.state.addressComplete);
    },
    persist: async (ctx) => {
      await ctx.persist({ serviceLocation: ctx.state.serviceLocation });
    },
  },

  price: {
    key: 'price',
    label: 'Quanto você cobra',
    Component: StepPrice,
    canContinue: () => true,
    persist: async (ctx) => {
      await ctx.persist({
        startingPrice: ctx.state.startingPrice,
        priceUnit: ctx.state.priceUnit,
      });
    },
  },

  images: {
    key: 'images',
    label: 'Fotos',
    Component: StepImages,
    enabled: (ctx) => ctx.resourceId != null,
    canContinue: (ctx) => (ctx.state.imageIds ?? []).length > 0,
    // Persistence happens inside ImageGalleryManager's `onPersist` → ctx.persistExtras.
  },

  description: {
    key: 'description',
    label: 'Descrição',
    Component: StepDescription,
    canContinue: (ctx) => stripHtml(ctx.state.description ?? '').length >= DESCRIPTION_MIN_LENGTH,
    persist: async (ctx) => {
      await ctx.persist({ description: ctx.state.description });
    },
  },

  'dynamic-form': {
    key: 'dynamic-form',
    label: 'Formulário',
    Component: StepDynamicForm,
    enabled: (ctx) => {
      const cat = dynamicFormCategory(ctx) as ServiceCategory | undefined;
      return Boolean(String(cat?.formKey ?? '').trim()) && ctx.resourceId != null;
    },
    canContinue: (ctx) => ctx.state.dynamicFormValid !== false,
    persist: async (ctx) => {
      const ok = (await getDynamicFormHolder(ctx).current?.persist()) ?? false;
      if (!ok) throw new Error('Nao foi possivel salvar as respostas do formulario.');
    },
  },

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
export { StepImages } from './step-images';
export { StepDescription } from './step-description';
export { StepDynamicForm } from './step-dynamic-form';
export { StepModeration } from './step-moderation';
export { moderateService, type ModerateServiceArgs } from './moderate-service';
export { syncServiceSubcategories } from './sync-service-subcategories';
