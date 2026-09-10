'use client';

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

  async function onPersist(_refId: string, ids: string[]): Promise<string[]> {
    const r = await persistExtras({ images: ids, coverFileId: ids[0] ?? null });
    if (!r.ok) throw new Error('Não foi possível salvar as imagens do serviço.');
    return ids;
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="Adicione fotos do seu trabalho"
        subtitle="Adicione ao menos 1 foto para continuar. A primeira vira a capa do anúncio."
        why="O cliente quer ver antes de chamar. Anúncios com foto recebem muito mais contato — mostre trabalhos prontos, o antes e depois, o seu material e a sua equipe."
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
          Volte e salve a categoria antes de adicionar fotos.
        </p>
      )}

      <StepHint tone="tip">
        Fotos suas valem mais que imagens da internet. Boa luz, enquadramento reto e o trabalho
        finalizado passam confiança.
      </StepHint>
    </div>
  );
}
