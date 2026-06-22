const SHEET_ID_RE =
  /(?:docs\.google\.com\/spreadsheets\/d\/|spreadsheets\.google\.com\/.*[?&]id=)([a-zA-Z0-9-_]+)/;

/** Extract a spreadsheet ID from a URL or bare ID string. */
export function parseSheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(SHEET_ID_RE);
  return match?.[1] ?? null;
}
