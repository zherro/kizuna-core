import { useAppPreferences } from '../../../providers/app-preferences-provider';
import { ChipToggleList } from '../../ui-better-soft/lists/chip-toggle-list';
import { PorQueIsso } from './por-que-isso';
import type { ServiceCategory, ServiceSubcategory } from '../service-type';

/**
 * Painel de especialidades ("tags") da categoria escolhida — usado dentro do passo Categoria.
 * Contador no título, chips num cartão destacado, explicação só no balão que encolhe.
 */
export function StepSubcategory({
  subcategories,
  loading,
  category,
  value,
  onChange,
}: {
  subcategories: ServiceSubcategory[];
  loading: boolean;
  category: ServiceCategory | undefined;
  value: string[];
  onChange: (subcategoryIds: string[]) => void;
}) {
  const { messages } = useAppPreferences();
  const t = messages.wizard;
  const filtered = subcategories
    .filter((subcategory) => String(subcategory.categoryId) === String(category?.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const count = value.filter((id) => filtered.some((s) => String(s.id) === String(id))).length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {t.subcategory.title}
          {count > 0 ? ` · ${count}` : ''}
        </p>
        <PorQueIsso label={t.common.whyShort}>{t.subcategory.why}</PorQueIsso>
      </div>

      {!loading && filtered.length === 0 ? (
        <p className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          {t.subcategory.empty}
        </p>
      ) : (
        <div className="rounded-xl bg-muted/30 p-3">
          <ChipToggleList
            options={filtered.map((subcategory) => ({
              id: String(subcategory.id),
              label: subcategory.name,
            }))}
            value={value.map(String)}
            onChange={onChange}
            accent="primary"
          />
        </div>
      )}
    </div>
  );
}
