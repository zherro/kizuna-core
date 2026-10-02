/**
 * Resolução de "estilo por categoria" pra tela de detalhe (e, futuramente, pro card de resumo) —
 * lida do `kizuna.config.json` do projeto (chave `serviceDetail`), nunca hardcoded aqui: o core
 * não conhece os slugs de categoria de um projeto específico (ver skill `criar-componente-core`).
 *
 * Sem config nenhuma (ou categoria sem entrada), cai sempre no variant `"service"` (o default) e
 * no hue default — o app funciona sem exigir configuração nenhuma pra isso.
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
  /** Variant default quando a categoria não está em `variantByCategorySlug`. */
  defaultVariant?: ServiceDetailVariant;
  /** slug da categoria (`categories.slug`) → variant registrada em `SERVICE_DETAIL_VARIANTS`. */
  variantByCategorySlug?: Record<string, ServiceDetailVariant>;
  /** Cor de acento por slug de categoria; `default` é usada quando o slug não está mapeado. */
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
 * `ServiceRecord` (passthrough do PostgREST, `slug` opcional) quanto um slug solto.
 */
export type CategoryStyleInput = { slug?: string | null } | string | null | undefined;

function slugOf(input: CategoryStyleInput): string | null {
  if (input == null) return null;
  return typeof input === 'string' ? input : (input.slug ?? null);
}

/** Variant de detalhe (e card) da categoria — `"service"` se não houver config ou entrada. */
export function resolveServiceDetailVariant(
  category: CategoryStyleInput,
  config?: ServiceDetailConfig | null
): ServiceDetailVariant {
  const slug = slugOf(category);
  const fromMap = slug ? config?.variantByCategorySlug?.[slug] : undefined;
  return fromMap ?? config?.defaultVariant ?? FALLBACK_VARIANT;
}

/** Hue (0-360) de acento da categoria — `colors.default.hue` ou 230 se nada configurado. */
export function resolveCategoryHue(
  category: CategoryStyleInput,
  config?: ServiceDetailConfig | null
): number {
  const slug = slugOf(category);
  const bySlug = slug ? config?.colors?.[slug]?.hue : undefined;
  return bySlug ?? config?.colors?.default?.hue ?? FALLBACK_HUE;
}

/** Vivid diagonal fill pro hue resolvido — usado atrás de ícones brancos / hero sem foto. */
export function hueGradient(hue: number): string {
  return `linear-gradient(135deg, oklch(0.68 0.15 ${hue}), oklch(0.5 0.17 ${hue}))`;
}
