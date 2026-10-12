/**
 * Resolução de "estilo por categoria" pra tela de detalhe (e, futuramente, pro card de resumo) —
 * lida do `kizuna.config.json` do projeto (chave `serviceDetail`), nunca hardcoded aqui: o core
 * não conhece os slugs de categoria de um projeto específico (ver skill `criar-componente-core`).
 *
 * Sem config nenhuma (ou categoria sem entrada), cai sempre no variant `"service"` (o default) e
 * no hue default — o app funciona sem exigir configuração nenhuma pra isso.
 *
 * Precedência: slug da categoria > slug do grupo de categorias > default > fallback.
 */

export type ServiceDetailVariant = string;

export type CategoryHueConfig = {
  /** Matiz OKLCH (0-360) usada nos acentos da categoria — título, ícones, marcador de seção. */
  hue: number;
};

export type ReactionButtonConfig = {
  /** Nome de ícone lucide-react (ex. "Heart"); inválido cai no ícone padrão do botão. */
  icon?: string;
  label?: string;
  labelActive?: string;
};

export type ServiceDetailConfig = {
  _comment?: string;
  /** Variant default quando nem a categoria (`variantByCategorySlug`) nem o grupo
   * (`variantByGroupSlug`) estão mapeados. */
  defaultVariant?: ServiceDetailVariant;
  /** slug da categoria (`categories.slug`) → variant registrada em `SERVICE_DETAIL_VARIANTS`. */
  variantByCategorySlug?: Record<string, ServiceDetailVariant>;
  /** slug do grupo de categorias (`categories_group.slug`) → variant. Vale pra toda categoria do
   * grupo sem entrada própria em `variantByCategorySlug` (a categoria tem precedência). */
  variantByGroupSlug?: Record<string, ServiceDetailVariant>;
  /** Só o CARD (busca, carrosséis): slug da categoria → variant do card, sem mudar a tela de
   * detalhe (ex. teatro com card de cinema e detalhe de evento). Sem entrada: o card segue a
   * variant do detalhe. */
  cardVariantByCategorySlug?: Record<string, ServiceDetailVariant>;
  /** Cor de acento por slug de categoria, depois por slug do grupo; `default` é usada quando
   * nenhum dos dois está mapeado. */
  colors?: Record<string, CategoryHueConfig>;
  /** Slugs de categoria fora dos resultados "misturados" (home, busca sem filtro, "veja também"
   * de outra categoria) — a categoria continua navegável sozinha (filtro direto por ela). Passe
   * pra `fn_search_services` como `p_exclude_category_slugs` só quando não há `p_category_id`. */
  excludeFromMixedCategorySlugs?: string[];
  /** Botões Gostei/Favoritar do detalhe (plugin swipe); remova um bloco para esconder o botão. */
  reactions?: { like?: ReactionButtonConfig; favorite?: ReactionButtonConfig };
};

const FALLBACK_VARIANT = 'service';
const FALLBACK_HUE = 230;

/**
 * Categoria mínima o bastante pra resolver estilo: aceita tanto o `category` embutido no
 * `ServiceRecord` (passthrough do PostgREST, `slug` opcional) quanto um slug solto. O objeto
 * também pode trazer `groupSlug` (slug do grupo de categorias) pra escolher estilo por grupo.
 */
export type CategoryStyleInput =
  | { slug?: string | null; groupSlug?: string | null }
  | string
  | null
  | undefined;

function slugOf(input: CategoryStyleInput): string | null {
  if (input == null) return null;
  return typeof input === 'string' ? input : (input.slug ?? null);
}

function groupSlugOf(input: CategoryStyleInput): string | null {
  if (input == null || typeof input === 'string') return null;
  return input.groupSlug ?? null;
}

/** Variant de detalhe (e card): categoria > grupo > default; `"service"` se nada configurado. */
export function resolveServiceDetailVariant(
  category: CategoryStyleInput,
  config?: ServiceDetailConfig | null
): ServiceDetailVariant {
  const slug = slugOf(category);
  const groupSlug = groupSlugOf(category);
  const bySlug = slug ? config?.variantByCategorySlug?.[slug] : undefined;
  const byGroup = groupSlug ? config?.variantByGroupSlug?.[groupSlug] : undefined;
  return bySlug ?? byGroup ?? config?.defaultVariant ?? FALLBACK_VARIANT;
}

/** Variant do CARD: `cardVariantByCategorySlug` da categoria > a mesma do detalhe. */
export function resolveServiceCardVariant(
  category: CategoryStyleInput,
  config?: ServiceDetailConfig | null
): ServiceDetailVariant {
  const slug = slugOf(category);
  const byCard = slug ? config?.cardVariantByCategorySlug?.[slug] : undefined;
  return byCard ?? resolveServiceDetailVariant(category, config);
}

/** Hue (0-360) de acento: `colors` da categoria > do grupo > `default`; 230 se nada configurado. */
export function resolveCategoryHue(
  category: CategoryStyleInput,
  config?: ServiceDetailConfig | null
): number {
  const slug = slugOf(category);
  const groupSlug = groupSlugOf(category);
  const bySlug = slug ? config?.colors?.[slug]?.hue : undefined;
  const byGroup = groupSlug ? config?.colors?.[groupSlug]?.hue : undefined;
  return bySlug ?? byGroup ?? config?.colors?.default?.hue ?? FALLBACK_HUE;
}

/** Vivid diagonal fill pro hue resolvido — usado atrás de ícones brancos / hero sem foto. */
export function hueGradient(hue: number): string {
  return `linear-gradient(135deg, oklch(0.68 0.15 ${hue}), oklch(0.5 0.17 ${hue}))`;
}
