'use client';

import { useAppPreferences } from '../../../providers/app-preferences-provider';
import type { WizardStep, WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
import { ImageGalleryManager } from '../../storage';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';
import { resolveStepProfile, type StepProfiles } from './step-profiles';

/** Perfil do passo `images` (ver `StepProfiles`). */
export type ImagesProfile = {
  /** Máximo de fotos por anúncio (inteiro de 1 a 20). Padrão do core: 3. */
  maxImages?: number;
};

export const DEFAULT_MAX_SERVICE_IMAGES = 3;
export const MAX_SERVICE_IMAGES_LIMIT = 20;

export function validateImagesProfile(profile: ImagesProfile) {
  const n = profile?.maxImages;
  if (n === undefined) return;
  if (!Number.isInteger(n) || n < 1 || n > MAX_SERVICE_IMAGES_LIMIT) {
    throw new Error(
      `stepProfiles.images: maxImages inválido "${String(n)}" (inteiro de 1 a ${MAX_SERVICE_IMAGES_LIMIT})`
    );
  }
}

export function createStepImages(profiles?: StepProfiles<ImagesProfile>) {
  return function StepImagesWithProfile(props: WizardStepProps<ServiceWizardState>) {
    const profile = resolveStepProfile<ImagesProfile>({}, profiles, props.entities, props.state);
    return <StepImages {...props} maxImages={profile.maxImages ?? DEFAULT_MAX_SERVICE_IMAGES} />;
  };
}

/** Passo `images` pronto pro registry, com os perfis dados (padrão: até 3 fotos). */
export function createImagesStep(profiles?: StepProfiles<ImagesProfile>): WizardStep<ServiceWizardState> {
  return {
    key: 'images',
    label: 'Fotos',
    Component: createStepImages(profiles),
    enabled: (ctx) => ctx.resourceId != null,
    canContinue: (ctx) => (ctx.state.imageIds ?? []).length > 0,
    // Persistence happens inside ImageGalleryManager's `onPersist` → ctx.persistExtras.
  };
}

export function StepImages({
  state,
  patch,
  persistExtras,
  resourceId,
  maxImages = DEFAULT_MAX_SERVICE_IMAGES,
}: WizardStepProps<ServiceWizardState> & { maxImages?: number }) {
  const value = state.imageIds ?? [];
  const { messages } = useAppPreferences();
  const t = messages.wizard;

  async function onPersist(_refId: string, ids: string[]): Promise<string[]> {
    const r = await persistExtras({ images: ids, coverFileId: ids[0] ?? null });
    if (!r.ok) throw new Error(t.images.saveError);
    return ids;
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title={t.images.title}
        subtitle={t.images.subtitle}
        why={t.images.why}
      />

      {resourceId != null ? (
        <ImageGalleryManager
          referenceId={String(resourceId)}
          initialImageIds={value}
          purpose="service_image"
          maxFiles={maxImages}
          onSaved={(ids) => patch({ imageIds: ids })}
          onPersist={onPersist}
        />
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          {t.images.saveFirst}
        </p>
      )}

      <StepHint tone="tip">
        {t.images.tip}
      </StepHint>
    </div>
  );
}
