const textWrap = (texto, limite) => {
    if (texto == null || texto.length <= limite) {
        return texto;
    }
    const trecho = texto.substring(0, limite);
    const ultimoEspaco = trecho.lastIndexOf(' ');
    if (ultimoEspaco > limite * 0.4) {
        return trecho.substring(0, ultimoEspaco) + '...';
    }
    return trecho + '...';
};
/** Strips HTML tags/entities, collapsing whitespace — useful for length checks/counters on rich-text output. */
function stripHtml(value) {
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
export { textWrap, stripHtml };
//# sourceMappingURL=text.helper.js.map