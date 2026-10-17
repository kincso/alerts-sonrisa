import type { Event, Severity, SourceId } from '@alerts/shared';

/** What `normalise` returns: an Event before it is stored (no id, no receivedAt yet). */
export type NewEvent = Omit<Event, 'id' | 'sourceId' | 'receivedAt'>;

/**
 * The extension point for sources (A2). One adapter file per source, registered in
 * registry.ts. Everything source-specific, severity included (D1), lives here.
 */
export interface Source {
  id: SourceId;
  label: string;
  /** Set when `normalise` gives every item this severity; shown in the alert form (S3-3). */
  fixedSeverity?: Severity;
  /** I/O only. Must respect `signal`. */
  fetchRaw(signal: AbortSignal): Promise<string>;
  /** Pure. Skips a malformed item; throws if the whole feed can't be parsed. */
  normalise(raw: string): NewEvent[];
}

/** Fetches `url` as text; a non-2xx status is an error. */
export async function fetchText(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}
