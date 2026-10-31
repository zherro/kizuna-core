export type SelectOption = {
    value: string;
    label: string;
};
type SearchableSelectProps = {
    /** Current value (controlled). */
    value: string;
    /** Called when selection changes. */
    onChange: (value: string) => void;
    /** Called on blur — use `formik.handleBlur` equivalent. */
    onBlur?: () => void;
    options: SelectOption[];
    placeholder?: string;
    /** Whether to show a search input inside the dropdown. Default: true. */
    searchable?: boolean;
    disabled?: boolean;
    className?: string;
    /** html id — useful for <Label htmlFor=...>. */
    id?: string;
};
/**
 * Searchable select component compatible with Formik.
 * Wraps a custom dropdown with optional keyword filtering on existing options.
 * Does NOT fetch remote data — filtering is in-memory only.
 */
export declare function SearchableSelect({ value, onChange, onBlur, options, placeholder, searchable, disabled, className, id, }: SearchableSelectProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=searchable-select.d.ts.map