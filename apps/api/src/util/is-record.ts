/** Narrows parsed JSON/XML before reading fields from it. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
