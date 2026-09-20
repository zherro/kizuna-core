'use client';

import { useAppPreferences } from '../../../providers/app-preferences-provider';
import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
import { ImageGalleryManager } from '../../storage';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

export function StepImages({
  state,
  patch,
  persistExtras,
  resourceId,
}: WizardStepProps<ServiceWizardState>) {
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
