/**
 * Cartão de resultado de listagem de marketplace, genérico, em duas densidades:
 *
 * - `variant="grid"` (padrão): cartão vertical completo (compõe `MediaResultCard`).
 * - `variant="strip"`: cartão compacto de largura fixa (~260px), pensado para trilha horizontal
 *   com scroll (mobile).
 *
 * Recebe tudo pronto via props — não sabe se o item é serviço, produto ou evento. Preço já vem
 * formatado (`priceLabel`).
 */
export type ListingResultCardProps = {
    href: string;
    title: string;
    /** Preço já formatado, ex. "R$ 120/h" ou "Sob consulta". */
    priceLabel: string;
    /** Badge no topo-direito (ex. categoria). */
    tagLabel?: string | null;
    /** Linha sob o título (ex. subcategoria). */
    subtitleLabel?: string | null;
    imageUrl?: string | null;
    /** Estilo de destaque (ex. patrocinado). */
    highlighted?: boolean;
    highlightLabel?: string;
    /** Nome + avatar do responsável pelo anúncio. */
    providerName?: string | null;
    providerAvatarUrl?: string | null;
    /** Texto do botão de ação. Default "Ver". */
    ctaLabel?: string;
    variant?: 'grid' | 'strip';
    className?: string;
};
export declare function ListingResultCard({ href, title, priceLabel, tagLabel, subtitleLabel, imageUrl, highlighted, highlightLabel, providerName, providerAvatarUrl, ctaLabel, variant, className, }: Readonly<ListingResultCardProps>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=listing-result-card.d.ts.map