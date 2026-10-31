export function formatDateTime(value) {
    if (!value)
        return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return '';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(parsed);
}
export function formatDate(iso) {
    if (!iso)
        return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
const nowDateString = () => new Date().toISOString().slice(0, 10);
const nowDateTimeString = () => new Date().toISOString();
export { nowDateString, nowDateTimeString };
//# sourceMappingURL=date.helper.js.map