type FormResultsPanelProps = {
    formKey: string;
    domain: string;
    referenceId: string;
    /** Optional heading above the rendered answers. */
    title?: string;
    className?: string;
};
/**
 * Read-only render of the current `form_results` row for a `(formKey, domain, referenceId)`
 * triple, drawn against its frozen `schema_snapshot` so old captures stay renderable after the
 * form is edited. Use it in an admin/detail surface next to the entity the answers describe.
 */
export declare function FormResultsPanel({ formKey, domain, referenceId, title, className, }: FormResultsPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FormResultsPanel.d.ts.map