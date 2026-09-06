export type ShowcaseSectionId = 'cards' | 'buttons' | 'forms' | 'tables' | 'alerts' | 'progress' | 'experience-pill' | 'bottom-progress-bar' | 'mosaic-grid' | 'admin-page-reader' | 'page-header' | 'bs-button' | 'toggle-row' | 'channel-chip' | 'schedule-row' | 'settings-section' | 'choice-card' | 'modal-panel' | 'confirm-dialog' | 'filter-stat-card' | 'entity-list-card' | 'media-result-card' | 'icon-choice-grid' | 'chip-toggle-list' | 'empty-state-card' | 'form-field' | 'number-field' | 'section-illustration' | 'entity-grid-list' | 'inline-alert' | 'rpc-tester' | 'pwa-register' | 'location-modal' | 'system-config-section' | 'form-builder' | 'forms-manager' | 'pages-admin';
export type ShowcaseGroupId = 'shadcn-default' | 'ui-better-soft';
export type ShowcaseSection = {
    id: ShowcaseSectionId;
    groupId: ShowcaseGroupId;
    label: string;
    description: string;
    usageCode: string;
};
export type ShowcaseGroup = {
    id: ShowcaseGroupId;
    label: string;
};
export declare const SHOWCASE_GROUPS: ShowcaseGroup[];
export declare const SHOWCASE_SECTIONS: ShowcaseSection[];
export declare const DEFAULT_SHOWCASE_SECTION: ShowcaseSectionId;
export declare function isShowcaseSection(value: string): value is ShowcaseSectionId;
export declare function normalizeShowcaseSection(value: string): ShowcaseSectionId | null;
export declare function getShowcaseSection(id: ShowcaseSectionId): ShowcaseSection;
//# sourceMappingURL=showcase-sections.d.ts.map