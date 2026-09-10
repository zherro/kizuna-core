export const TAXONOMY_RESOURCE_BY_LEVEL = {
    group: 'categories_group',
    category: 'categories',
    subcategory: 'subcategories',
    tag: 'categories_sub_tags',
};
export const TAXONOMY_LEVEL_LABEL = {
    group: 'grupo',
    category: 'categoria',
    subcategory: 'especialidade',
    tag: 'tag',
};
export function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
//# sourceMappingURL=taxonomy-types.js.map