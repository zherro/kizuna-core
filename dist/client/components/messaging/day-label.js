// Agrupamento de mensagens por dia. `dayKey` é estável (YYYY-MM-DD no fuso local)
// pra comparar; `dayLabel` é o texto do separador — "Hoje" / "Ontem" por extenso,
// senão a data legível (sem o ano quando é o ano corrente).
export function dayKey(iso) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
export function dayLabel(iso, now = new Date()) {
    const key = dayKey(iso);
    if (key === dayKey(now.toISOString()))
        return 'Hoje';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (key === dayKey(yesterday.toISOString()))
        return 'Ontem';
    const d = new Date(iso);
    const sameYear = d.getFullYear() === now.getFullYear();
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
    }).format(d);
}
/** Quebra a lista (já ordenada ASC) em grupos por dia. */
export function groupByDay(items) {
    const groups = [];
    for (const item of items) {
        const key = dayKey(item.createdAt);
        const last = groups[groups.length - 1];
        if (last && last.key === key) {
            last.items.push(item);
        }
        else {
            groups.push({ key, label: dayLabel(item.createdAt), items: [item] });
        }
    }
    return groups;
}
//# sourceMappingURL=day-label.js.map