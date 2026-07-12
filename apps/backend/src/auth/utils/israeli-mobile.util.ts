/**
 * Validates and normalizes Israeli **mobile** numbers (cellular).
 * Only `05XXXXXXXX` is accepted (optional spaces/dashes between digits).
 */
export function parseIsraeliMobile(input: unknown): string | null {
  if (input === undefined || input === null) {
    return null;
  }

  const trimmed = String(input).trim();

  if (trimmed === '') {
    return null;
  }

  const compact = trimmed.replace(/[\s-]/g, '');

  if (!/^05\d{8}$/.test(compact)) {
    return null;
  }

  return compact;
}
