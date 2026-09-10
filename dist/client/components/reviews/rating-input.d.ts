type RatingSize = 'sm' | 'md' | 'lg';
type RatingInputProps = {
    value: number;
    onChange: (next: number) => void;
    max?: number;
    size?: RatingSize;
    disabled?: boolean;
    name?: string;
    /** Accessible group label; defaults to pt-BR copy. */
    label?: string;
};
/**
 * Accessible star rating picker: `role="radiogroup"`, arrow keys move the value,
 * digits 1-max jump to a value, tap targets ≥ 40px (md/lg). Colored fill uses
 * `text-amber-500` / `fill-current` (text-color utilities work project-wide;
 * border/ring color utilities do not).
 */
export declare function RatingInput({ value, onChange, max, size, disabled, name, label, }: Readonly<RatingInputProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=rating-input.d.ts.map