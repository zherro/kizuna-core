import type { WizardStep } from '../../wizard/types';
import { type ServiceWizardState } from '../service-type';
/**
 * The 8 domain steps of the `services` wizard, as ready-made `WizardStep` objects. Consuming
 * apps pass this as the `Wizard` config `registry` and list the keys in `steps`.
 *
 * `step-images` renders the core `ImageGalleryManager` directly; its `onPersist` (via
 * `ctx.persistExtras`) writes `extras.images` / `extras.coverFileId`.
 */
export declare const SERVICE_WIZARD_STEPS: Record<string, WizardStep<ServiceWizardState>>;
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
//# sourceMappingURL=index.d.ts.map