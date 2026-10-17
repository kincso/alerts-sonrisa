import type { ChannelConfig, SendResult } from '@alerts/shared';
import type { Db } from '../db/database.ts';
import { finishDelivery } from '../db/deliveries.ts';
import { insertPreview } from '../db/previews.ts';
import { SEND_TIMEOUT_MS, withTimeout } from '../util/with-timeout.ts';
import type { Notification, NotificationChannel } from './notification-channel.ts';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Sends once to an already claimed delivery row (design.md §3): timeout, store the
 * email preview, record the result. No retry (A16). A send error becomes 'failed';
 * only a DB error while recording can throw.
 */
export async function deliver(
  db: Db,
  deliveryId: string,
  channel: NotificationChannel,
  notification: Notification,
  config: ChannelConfig,
  timeoutMs = SEND_TIMEOUT_MS,
): Promise<SendResult> {
  let result: SendResult;
  let previewId: string | null = null;
  try {
    const outcome = await withTimeout(
      (signal) => channel.send(notification, config, signal),
      timeoutMs,
    );
    previewId = outcome.preview ? insertPreview(db, outcome.preview) : null;
    result = previewId
      ? { status: outcome.status, previewUrl: `/api/previews/${previewId}` }
      : { status: outcome.status };
  } catch (err) {
    result = { status: 'failed', error: errorMessage(err) };
  }
  finishDelivery(db, deliveryId, result, previewId);
  return result;
}
