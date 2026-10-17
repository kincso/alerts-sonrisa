import type { Severity } from './index';

/** A source key such as 'usgs' or 'bbc'. Plain string, like a channel type (A2). */
export type SourceId = string;

/** A stored, normalised event (A2, A7). Every source is mapped into this shape. */
export interface Event {
  id: string;
  sourceId: SourceId;
  sourceEventId: string;
  title: string;
  summary: string;
  url?: string;
  severity: Severity;
  occurredAt: string;
  receivedAt: string;
}

/** POST /api/admin/sources/:id/poll (decisions.md S2-4). */
export interface PollResult {
  sourceId: SourceId;
  /** 'skipped': the source is disabled or its previous poll is still running. */
  status: 'ok' | 'skipped' | 'failed';
  /** Items returned by `normalise`. */
  fetched: number;
  /** New rows after dedupe. */
  inserted: number;
  error?: string;
}
