'use client';

import type { ComponentType } from 'react';
import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';

/**
 * Contract for the image manager the consuming app injects (foco-total passes its
 * `components/ads/ad-images-manager.tsx` — `AdImagesManager` — in Task 14). The core MUST NOT
 * import that component (it carries `ads`-table baggage), so this step takes it as a prop.
 *
 * - `adId`      — the `services` row id (manager keys its uploads by it).
 * - `value`     — current ordered image file ids.
 * - `onChange`  — called when the manager mutates the list (after upload/remove/reorder).
 * - `onPersist` — called by the manager to persist; must resolve the saved id list. The step
 *                 passes an `onPersist` that writes `extras.images` / `extras.coverFileId` via
 *                 `ctx.persistExtras`.
 */
export type ServiceImagesManager = ComponentType<{
  adId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  onPersist: (adId: string, ids: string[]) => Promise<Array<string | number>>;
}>;

function PlaceholderManager() {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
      Nenhum gerenciador de imagens configurado. O app consumidor deve passar `ImagesManager`.
    </p>
  );
}

export function StepImages({
  state,
  patch,
  persistExtras,
  resourceId,
  ImagesManager = PlaceholderManager,
}: WizardStepProps<ServiceWizardState> & { ImagesManager?: ServiceImagesManager }) {
  const value = state.imageIds ?? [];

  async function onPersist(_adId: string, ids: string[]): Promise<Array<string | number>> {
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
        <ImagesManager
          adId={String(resourceId)}
          value={value}
          onChange={(ids) => patch({ imageIds: ids })}
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
