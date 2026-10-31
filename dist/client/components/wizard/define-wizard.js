export function defineWizard(config) {
    const keys = new Set();
    for (const s of config.steps) {
        const key = typeof s === 'string' ? s : s.key;
        if (keys.has(key))
            throw new Error(`defineWizard: step duplicado "${key}"`);
        keys.add(key);
    }
    const known = new Set([...keys, ...Object.keys(config.registry ?? {})]);
    for (const s of config.steps) {
        if (typeof s === 'string')
            continue;
        const anchor = s.after ?? s.before;
        if (anchor && !known.has(anchor)) {
            throw new Error(`defineWizard: step "${s.key}" referencia âncora inexistente "${anchor}"`);
        }
    }
    return config;
}
//# sourceMappingURL=define-wizard.js.map