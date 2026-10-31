import * as LucideIcons from 'lucide-react';
const NON_ICON_EXPORTS = new Set(['icons', 'createLucideIcon', 'default']);
/**
 * Resolves an icon persisted in the database (lucide-react export name, e.g.
 * "Home") into its component. Used for admin-editable icons on
 * categories/categories_group, since the name is free text typed by an admin.
 */
export function resolveLucideIcon(name) {
    if (!name || NON_ICON_EXPORTS.has(name))
        return null;
    const icon = LucideIcons[name];
    return icon ?? null;
}
//# sourceMappingURL=lucide-icon.js.map