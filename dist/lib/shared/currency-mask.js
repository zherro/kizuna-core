export function formatCurrencyMask(value) {
    if (typeof value === 'number') {
        if (!Number.isFinite(value))
            return '';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    }
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits)
        return '';
    const cents = Number(digits);
    if (!Number.isFinite(cents))
        return '';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}
export function parseCurrencyMask(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits)
        return null;
    const cents = Number(digits);
    if (!Number.isFinite(cents))
        return null;
    return cents / 100;
}
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    }).format(value);
}
//# sourceMappingURL=currency-mask.js.map