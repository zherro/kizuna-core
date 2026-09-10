/** Strips HTML tags/entities, collapsing whitespace — useful for length checks/counters on rich-text output. */
function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export { stripHtml };
