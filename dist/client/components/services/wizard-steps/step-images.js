'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ImageGalleryManager } from '../../storage';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';
export function StepImages({ state, patch, persistExtras, resourceId, }) {
    const value = state.imageIds ?? [];
    async function onPersist(_refId, ids) {
        const r = await persistExtras({ images: ids, coverFileId: ids[0] ?? null });
        if (!r.ok)
            throw new Error('Não foi possível salvar as imagens do serviço.');
        return ids;
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(StepHeader, { title: "Adicione fotos do seu trabalho", subtitle: "Adicione ao menos 1 foto para continuar. A primeira vira a capa do an\u00FAncio.", why: "O cliente quer ver antes de chamar. An\u00FAncios com foto recebem muito mais contato \u2014 mostre trabalhos prontos, o antes e depois, o seu material e a sua equipe." }), resourceId != null ? (_jsx(ImageGalleryManager, { referenceId: String(resourceId), initialImageIds: value, purpose: "service_image", onSaved: (ids) => patch({ imageIds: ids }), onPersist: onPersist })) : (_jsx("p", { className: "rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground", children: "Volte e salve a categoria antes de adicionar fotos." })), _jsx(StepHint, { tone: "tip", children: "Fotos suas valem mais que imagens da internet. Boa luz, enquadramento reto e o trabalho finalizado passam confian\u00E7a." })] }));
}
//# sourceMappingURL=step-images.js.map