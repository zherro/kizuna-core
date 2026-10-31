export type SystemConfigFieldSpec = {
    type: 'toggle';
    key: string;
    title: string;
    subtitle?: string;
    disabledWhen?: (value: Record<string, unknown>) => boolean;
} | {
    type: 'select';
    key: string;
    label: string;
    options: Array<{
        value: string;
        label: string;
    }>;
    disabledWhen?: (value: Record<string, unknown>) => boolean;
} | {
    type: 'textarea';
    key: string;
    label: string;
    placeholder?: string;
    helperText?: string;
    disabledWhen?: (value: Record<string, unknown>) => boolean;
};
export type SystemConfigSectionProps = {
    /** The `auth.system_config.key` this section edits — the whole `value` jsonb is owned by this section. */
    configKey: string;
    title: string;
    description?: string;
    fields: SystemConfigFieldSpec[];
    initialValue: Record<string, unknown>;
};
/**
 * One editable `auth.system_config` row, driven entirely by `fields` — a project defines which
 * keys of the jsonb `value` exist and how to edit them (toggle/select/textarea), this component
 * renders the card and handles save. Generic: knows nothing about what the config key actually
 * means (a project's own screen supplies that via `title`/`description`/field labels).
 */
export declare function SystemConfigSection({ configKey, title, description, fields, initialValue, }: Readonly<SystemConfigSectionProps>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=system-config-section.d.ts.map