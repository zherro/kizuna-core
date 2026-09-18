type PageHeaderBlockProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    /** When set, renders a "voltar" link built from this href — no JSX ever comes from screen config. */
    backHref?: string;
    backLabel?: string;
};
/**
 * Server-safe screen-engine block wrapping `PageHeader` (cataloged in showcase, id `page-header`).
 * Takes only serializable props — the back link is built here from `backHref`, never passed in as
 * JSX, so a screen config can stay plain JSON.
 */
export declare function PageHeaderBlock({ eyebrow, title, description, backHref, backLabel, }: Readonly<PageHeaderBlockProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=page-header-block.d.ts.map