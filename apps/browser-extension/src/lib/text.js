// Text normalization helpers shared by the content script at build time.

export function normalizeText(value) {
  return String(value == null ? '' : value)
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function collapseWhitespace(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}
