import { SEVERITIES, type AlertInput, type FieldErrors, type Severity } from '@alerts/shared';
import { isRecord } from '../util/is-record.ts';

export type ParsedAlertInput =
  { ok: true; input: AlertInput } | { ok: false; fieldErrors: FieldErrors };

export interface AlertInputChecks {
  sourceExists(id: string): boolean;
  /** DS12: true only for the current user's own connections. */
  ownsConnection(id: string): boolean;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Trimmed, non-empty strings, without duplicates (compared case-insensitively). */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value.map(asString)) {
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      result.push(item);
    }
  }
  return result;
}

/** Missing → [] (every event); present but not a list of strings → undefined (S3 review m1). */
function keywordList(value: unknown): string[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return undefined;
  return stringList(value);
}

function asSeverity(value: unknown): Severity | undefined {
  return SEVERITIES.find((s) => s === value);
}

function connectionError(ids: readonly string[], checks: AlertInputChecks): string | undefined {
  if (ids.length === 0) return 'Choose at least one connection.'; // decisions.md S3-4
  // Same message for an unknown id and another user's id: reveals nothing (DS12).
  if (!ids.every((id) => checks.ownsConnection(id))) return 'Choose connections from your list.';
  return undefined;
}

/** Required fields and DS12 ownership; no schema library (DS1). */
export function parseAlertInput(body: unknown, checks: AlertInputChecks): ParsedAlertInput {
  const raw = isRecord(body) ? body : {};
  const name = asString(raw['name']);
  const sourceId = asString(raw['sourceId']);
  const minSeverity = asSeverity(raw['minSeverity']);
  const connectionIds = stringList(raw['connectionIds']);
  const keywords = keywordList(raw['keywords']);

  const fieldErrors: FieldErrors = {};
  if (!name) fieldErrors['name'] = 'Name is required.';
  if (!checks.sourceExists(sourceId)) fieldErrors['sourceId'] = 'Choose a source.';
  if (!minSeverity) fieldErrors['minSeverity'] = 'Choose a minimum severity.';
  if (!keywords) fieldErrors['keywords'] = 'Keywords must be a list of words.';
  const connections = connectionError(connectionIds, checks);
  if (connections) fieldErrors['connectionIds'] = connections;

  if (!minSeverity || !keywords || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, input: { name, sourceId, keywords, minSeverity, connectionIds } };
}
