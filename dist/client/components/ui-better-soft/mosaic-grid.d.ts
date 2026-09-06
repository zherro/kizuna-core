export type MosaicGridSpan = 'default' | 'wide' | 'tall' | 'large';
export type MosaicGridItem = {
    id: string;
    label: string;
    hint?: string;
    image: string;
    href?: string;
    span?: MosaicGridSpan;
};
type MosaicGridProps = {
    items: MosaicGridItem[];
    className?: string;
    tileClassName?: string;
    onItemClick?: (item: MosaicGridItem) => void;
};
export declare function MosaicGrid({ items, className, tileClassName, onItemClick }: MosaicGridProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=mosaic-grid.d.ts.map