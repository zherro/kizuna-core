import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
// ─── Static class maps (Tailwind v4 scans these literals) ────────────────────
//
// Tailwind v4 does NOT support dynamic class interpolation like `${bp}:text-${size}`.
// Every class must appear as a complete string somewhere in source.
// These maps are the single source of truth — all classes exist here as literals.
const BASE_SIZE = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
    '6xl': 'text-6xl',
};
const SM_SIZE = {
    xs: 'sm:text-xs',
    sm: 'sm:text-sm',
    base: 'sm:text-base',
    lg: 'sm:text-lg',
    xl: 'sm:text-xl',
    '2xl': 'sm:text-2xl',
    '3xl': 'sm:text-3xl',
    '4xl': 'sm:text-4xl',
    '5xl': 'sm:text-5xl',
    '6xl': 'sm:text-6xl',
};
const MD_SIZE = {
    xs: 'md:text-xs',
    sm: 'md:text-sm',
    base: 'md:text-base',
    lg: 'md:text-lg',
    xl: 'md:text-xl',
    '2xl': 'md:text-2xl',
    '3xl': 'md:text-3xl',
    '4xl': 'md:text-4xl',
    '5xl': 'md:text-5xl',
    '6xl': 'md:text-6xl',
};
const LG_SIZE = {
    xs: 'lg:text-xs',
    sm: 'lg:text-sm',
    base: 'lg:text-base',
    lg: 'lg:text-lg',
    xl: 'lg:text-xl',
    '2xl': 'lg:text-2xl',
    '3xl': 'lg:text-3xl',
    '4xl': 'lg:text-4xl',
    '5xl': 'lg:text-5xl',
    '6xl': 'lg:text-6xl',
};
const XL_SIZE = {
    xs: 'xl:text-xs',
    sm: 'xl:text-sm',
    base: 'xl:text-base',
    lg: 'xl:text-lg',
    xl: 'xl:text-xl',
    '2xl': 'xl:text-2xl',
    '3xl': 'xl:text-3xl',
    '4xl': 'xl:text-4xl',
    '5xl': 'xl:text-5xl',
    '6xl': 'xl:text-6xl',
};
const BP_MAP = {
    base: BASE_SIZE,
    sm: SM_SIZE,
    md: MD_SIZE,
    lg: LG_SIZE,
    xl: XL_SIZE,
};
function getResponsiveClasses(size) {
    return Object.entries(size)
        .filter(([, value]) => value !== undefined)
        .map(([bp, value]) => BP_MAP[bp][value]);
}
// ─── Defaults per tag ─────────────────────────────────────────────────────────
const DEFAULT_SIZE = {
    h1: { base: '2xl', sm: '3xl', md: '4xl', lg: '5xl' },
    h2: { base: 'xl', sm: '2xl', md: '3xl', lg: '4xl' },
    h3: { base: 'lg', sm: 'xl', md: '2xl', lg: '3xl' },
    h4: { base: 'base', sm: 'lg', md: 'xl', lg: '2xl' },
    h5: { base: 'base', md: 'lg', lg: 'xl' },
    h6: { base: 'sm', md: 'base', lg: 'lg' },
    p: { base: 'sm', md: 'base' },
    span: { base: 'sm', md: 'base' },
};
const DEFAULT_WEIGHT = {
    h1: 'bold',
    h2: 'semibold',
    h3: 'semibold',
    h4: 'medium',
    h5: 'medium',
    h6: 'medium',
    p: 'normal',
    span: 'normal',
};
// ─── Other maps ───────────────────────────────────────────────────────────────
const COLOR_MAP = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary-foreground',
    destructive: 'text-destructive',
};
const WEIGHT_MAP = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
};
const ALIGN_MAP = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
};
const LINE_HEIGHT_MAP = {
    h1: 'leading-tight',
    h2: 'leading-tight',
    h3: 'leading-snug',
    h4: 'leading-snug',
    h5: 'leading-normal',
    h6: 'leading-normal',
    p: 'leading-relaxed',
    span: 'leading-normal',
};
const LINE_CLAMP_MAP = {
    1: 'line-clamp-1',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4',
    5: 'line-clamp-5',
    6: 'line-clamp-6',
};
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
// ─── Base component ───────────────────────────────────────────────────────────
function TypographyBase({ as, children, className, size, color = 'default', weight, align = 'left', lineClamp, bold = false, italic = false, }) {
    const Component = as;
    const resolvedSize = { ...DEFAULT_SIZE[as], ...size };
    const resolvedWeight = bold ? 'bold' : (weight ?? DEFAULT_WEIGHT[as]);
    return (_jsx(Component, { className: clsx(getResponsiveClasses(resolvedSize), COLOR_MAP[color], WEIGHT_MAP[resolvedWeight], ALIGN_MAP[align], LINE_HEIGHT_MAP[as], lineClamp && LINE_CLAMP_MAP[lineClamp], HEADING_TAGS.includes(as) && 'tracking-tight', italic && 'italic', className), children: children }));
}
export const Typography = {
    H1: (props) => _jsx(TypographyBase, { as: "h1", ...props }),
    H2: (props) => _jsx(TypographyBase, { as: "h2", ...props }),
    H3: (props) => _jsx(TypographyBase, { as: "h3", ...props }),
    H4: (props) => _jsx(TypographyBase, { as: "h4", ...props }),
    H5: (props) => _jsx(TypographyBase, { as: "h5", ...props }),
    H6: (props) => _jsx(TypographyBase, { as: "h6", ...props }),
    P: (props) => _jsx(TypographyBase, { as: "p", ...props }),
    Span: (props) => _jsx(TypographyBase, { as: "span", ...props }),
};
//# sourceMappingURL=typography.js.map