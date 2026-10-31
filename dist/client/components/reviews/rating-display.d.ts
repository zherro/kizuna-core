type RatingSize = 'sm' | 'md' | 'lg';
type RatingDisplayProps = {
    value: number;
    max?: number;
    size?: RatingSize;
    showValue?: boolean;
    /** Optional review count rendered after the stars, e.g. "· 128". */
    count?: number;
};
/**
 * Read-only star rating. Fractional values render a partial last star via an
 * overlaid clipped copy. `aria-label` reads e.g. "4,7 de 5".
 */
export declare function RatingDisplay({ value, max, size, showValue, count, }: Readonly<RatingDisplayProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=rating-display.d.ts.map