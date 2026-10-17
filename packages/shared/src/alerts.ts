import type { Severity } from './index';
import type { SourceId } from './sources';

/** A user's alert rule (A1, A14). Sends to every linked connection. */
export interface Alert {
  id: string;
  name: string;
  sourceId: SourceId;
  /** Empty = every event from the source; otherwise any-of, case-insensitive (D8). */
  keywords: string[];
  minSeverity: Severity;
  active: boolean;
  /** At least one, all owned by the alert's user (DS12, decisions.md S3-4). */
  connectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** POST / PUT /api/me/alerts. */
export type AlertInput = Pick<
  Alert,
  'name' | 'sourceId' | 'keywords' | 'minSeverity' | 'connectionIds'
>;

/** PATCH /api/me/alerts/:id: pause or resume. */
export interface AlertActivePatch {
  active: boolean;
}

/** 409 body of DELETE /api/me/connections/:id while alerts use it (D6, DS4). */
export interface ConnectionInUseError {
  message: string;
  alerts: { id: string; name: string }[];
}
