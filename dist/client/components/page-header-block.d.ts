type PageHeaderBlockProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    /** When set, renders a "voltar" link built from this href — no JSX ever comes from screen config. */
    backHref?: string;
    backLabel?: string;
    /**
     * `'default'` (compact grid header, most screens) or `'admin-reader'` (bold title + back-arrow
     * chip, the /painel/agenda/feriados look — this app's card-page standard). Optional per-screen
     * config, exactly the kind of "screen builder optional setting" this engine exists for — see
     * .claude/libs/screen-engine.md. Omit for `'default'`.
     */
    variant?: 'default' | 'admin-reader';
};
/**
 * Server-safe screen-engine block wrapping either `PageHeader` (already cataloged in showcase, id
 * `page-header`) or, when `variant: 'admin-reader'`, `AdminPageReader`. Takes only serializable
 * props — the back link is built here from `backHref`, never passed in as JSX, so a screen config
 * can stay plain JSON.
 */
export declare function PageHeaderBlock({ eyebrow, title, description, backHref, backLabel, variant, }: Readonly<PageHeaderBlockProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=page-header-block.d.ts.map