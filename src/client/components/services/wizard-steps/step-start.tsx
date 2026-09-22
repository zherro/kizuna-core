"use client";

import { useAppPreferences } from "../../../providers/app-preferences-provider";
import type { WizardStepProps } from "../../wizard/types";
import type {
  ServiceCategory,
  ServiceGroup,
  ServiceSubcategory,
  ServiceWizardState,
} from "../service-type";
import { CategorySummary } from "./category-summary";
import { StepHeader } from "./step-header";

/**
 * Passo 1 do wizard — "Início". Só o nome/título do serviço. O antigo atalho da Naví virou
 * responsabilidade do engine: quando `assist` está disponível, o `Wizard` renderiza o próprio
 * botão "Preencher com IA" no header. Os exemplos estáticos saíram daqui — a Naví conversacional
 * já sugere títulos personalizados no lugar (ver `use-navi-conversation.ts`).
 */
export function StepStart({
  state,
  patch,
  entities,
  goToStep,
}: WizardStepProps<ServiceWizardState>) {
  const title = state.title ?? "";
  const handleChange = (value: string) => patch({ title: value.slice(0, 120) });
  const { messages } = useAppPreferences();
  const t = messages.wizard;

  // A ordem dos passos é dinâmica: se a categoria já foi escolhida antes do título, mostra o
  // resumo dela (com as tags) e deixa voltar pra editar.
  const groups = (entities.groups as ServiceGroup[] | undefined) ?? [];
  const categories =
    (entities.categories as ServiceCategory[] | undefined) ?? [];
  const subcategories =
    (entities.subcategories as ServiceSubcategory[] | undefined) ?? [];
  const group = groups.find((g) => String(g.id) === String(state.groupId));
  const category = categories.find(
    (c) => String(c.id) === String(state.categoryId),
  );
  const tagIds = (state.subcategoryIds ?? []).map(String);
  const tagNames = subcategories
    .filter(
      (s) =>
        String(s.categoryId) === String(state.categoryId) &&
        tagIds.includes(String(s.id)),
    )
    .map((s) => s.name);
  const hasSubcategories = subcategories.some(
    (s) => String(s.categoryId) === String(state.categoryId),
  );

  return (
    <div className="space-y-6">
      <StepHeader title={t.start.title} subtitle={t.start.subtitle} />

      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={t.start.placeholder}
          className="h-11 w-full rounded-lg border bg-background px-3.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
        />

        {title.trim().length > 0 && title.trim().length < 5 ? (
          <p className="text-xs text-muted-foreground">{t.start.tooShort}</p>
        ) : null}
      </div>
    </div>
  );
}
