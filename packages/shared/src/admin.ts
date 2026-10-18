import type { Alert } from './alerts';
import type { DeliveryView } from './deliveries';
import type { SourceSummary } from './sources';

/** GET /api/admin/alerts: every user's alerts, read-only (A9, decisions.md S4-2). */
export interface AdminAlertView extends Alert {
  ownerName: string;
  /** Labels of `connectionIds`, in the same order. */
  connectionLabels: string[];
}

/** GET /api/admin/deliveries: the whole delivery log (A9, A16). */
export interface AdminDeliveryView extends DeliveryView {
  userName: string;
}

/** GET /api/admin/sources: source health (A9). */
export interface SourceHealth extends SourceSummary {
  /** The D7 baseline; moves forward when the source is re-enabled (decisions.md S4-3). */
  enabledAt: string;
  lastPollAt?: string;
  lastError?: string;
}

/** GET /api/admin/channels: the channel types the admin can switch on and off (A9). */
export interface ChannelTypeSummary {
  type: string;
  label: string;
  enabled: boolean;
}

/** PATCH /api/admin/sources/:id and /api/admin/channels/:type. */
export interface EnabledPatch {
  enabled: boolean;
}
