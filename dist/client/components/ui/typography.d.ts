import { ReactNode } from 'react';
type HtmlTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';
type ResponsiveSize = Partial<Record<Breakpoint, TextSize>>;
type Color = 'default' | 'muted' | 'primary' | 'secondary' | 'destructive';
type Weight = 'normal' | 'medium' | 'semibold' | 'bold';
type Align = 'left' | 'center' | 'right' | 'justify';
type TypographyProps = {
    as: HtmlTag;
    children: ReactNode;
    className?: string;
    size?: ResponsiveSize;
    color?: Color;
    weight?: Weight;
    align?: Align;
    lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
    bold?: boolean;
    italic?: boolean;
};
type PublicProps = Omit<TypographyProps, 'as'>;
export declare const Typography: {
    H1: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
    H2: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
    H3: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
    H4: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
    H5: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
    H6: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
    P: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
    Span: (props: PublicProps) => import("react/jsx-runtime").JSX.Element;
};
export {};
//# sourceMappingURL=typography.d.ts.map