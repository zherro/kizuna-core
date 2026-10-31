import { ReactNode } from 'react';
/**
| Nome        | Largura |
| ----------- | ------- |
| `compact`   | 1024px  |
| `default`   | 1280px  |
| `wide`      | 1440px  |
| `ultraWide` | 1600px  |
| `fluid`     | 100%    |
*/
type ContainerSize = 'compact' | 'default' | 'wide' | 'ultraWide' | 'fluid';
type PaddingPreset = 'none' | 'sm' | 'default' | 'lg' | 'xl';
type Cols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Breakpoints = {
    xs?: Cols;
    sm?: Cols;
    md?: Cols;
    lg?: Cols;
    xl?: Cols;
};
type Space = {
    spaceY?: number;
    spaceX?: number;
    space?: number;
};
export type GridProps = Breakpoints & Space & {
    children?: ReactNode;
    container?: boolean;
    card?: boolean;
    row?: boolean;
    gap?: number;
    className?: string;
    padding?: PaddingPreset;
    px?: number;
    py?: number;
    containerSize?: ContainerSize;
};
export declare function Grid({ children, container, card, row, gap, className, xs, sm, md, lg, xl, padding, px, py, containerSize, }: GridProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=grid.d.ts.map