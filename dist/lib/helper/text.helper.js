/** Strips HTML tags/entities, collapsing whitespace — useful for length checks/counters on rich-text output. */
function stripHtml(value) {
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
export { stripHtml };
//# sourceMappingURL=text.helper.js.map