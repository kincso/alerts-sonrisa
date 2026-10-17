import type { ChannelConfig, ChannelField, FieldErrors } from '@alerts/shared';
import type { EmailPreview } from '../db/previews.ts';

/** What every channel renders (A15). Built by the caller, never by a channel. */
export interface Notification {
  title: string;
  summary: string;
  url?: string;
  sourceLabel: string;
  occurredAt: string;
  /** Name of the alert that matched; absent for "Send test". */
  alertName?: string;
}

/** A successful send. A failed send throws instead. */
export interface SendOutcome {
  status: 'sent' | 'dry-run';
  /** Rendered email, stored by the caller and served at /api/previews/:id (S1-2). */
  preview?: EmailPreview;
}

/**
 * The extension point for "add channels later" (A12). One adapter file per channel,
 * registered in registry.ts. Field keys must not be `label` or `type` (they share
 * the FieldErrors namespace with the connection's own fields).
 */
export interface NotificationChannel {
  type: string;
  label: string;
  fields: ChannelField[];
  /** `{}` means valid. The only place channel config is validated. */
  validate(config: ChannelConfig): FieldErrors;
  /** Throws on failure. Must respect `signal` where the transport allows it. */
  send(
    notification: Notification,
    config: ChannelConfig,
    signal: AbortSignal,
  ): Promise<SendOutcome>;
}
