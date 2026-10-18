import type { DeliveryStatus } from './channels';
import type { Severity } from './index';
import type { Event, SourceId } from './sources';

/** One row of the delivery log (A16, A17), as the user and admin see it. */
export interface DeliveryView {
  id: string;
  /** 'test' = "Send test" (DS8): no alert and no event. */
  kind: 'alert' | 'test';
  /** Snapshot taken at send time (DS5); absent for test rows. */
  alertName?: string;
  connectionLabel: string;
  channelType: string;
  status: DeliveryStatus;
  error?: string;
  previewUrl?: string;
  event?: Pick<Event, 'id' | 'sourceId' | 'title' | 'url' | 'severity' | 'occurredAt'>;
  createdAt: string;
}

/**
 * POST /api/admin/simulate-event (A18). A source with `fixedSeverity` accepts only that
 * severity, e.g. BBC → medium; otherwise 400 `fieldErrors.severity` (decisions.md S3-2).
 */
export interface SimulateEventInput {
  sourceId: SourceId;
  title: string;
  summary?: string;
  severity: Severity;
  /** Omitted → `sim-<uuid>`. Reusing one re-dispatches the stored event (S3-1). */
  sourceEventId?: string;
}

export interface SimulateEventResult {
  event: Event;
  /** Only the deliveries this call created; `[]` when everything was already sent. */
  deliveries: DeliveryView[];
}
