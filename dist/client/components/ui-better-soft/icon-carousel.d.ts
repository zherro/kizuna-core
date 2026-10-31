export type IconCarouselItem = {
    id: string | number;
    label: string;
    /** lucide-react export name persisted on the entity (e.g. "Home"); rendered via <TaxonomyIcon>. */
    icon?: string | null;
    active?: boolean;
    onClick?: () => void;
};
type IconCarouselProps = {
    items: IconCarouselItem[];
    ariaPrevLabel?: string;
    ariaNextLabel?: string;
    className?: string;
};
/**
 * Presentational-only horizontal carousel of icon + label cards. Receives a list of
 * config items and renders them — no data fetching, no business logic. Same Embla
 * setup as the home page's category strip (dragFree, prev/next).
 */
export declare function IconCarousel({ items, ariaPrevLabel, ariaNextLabel, className, }: IconCarouselProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=icon-carousel.d.ts.map