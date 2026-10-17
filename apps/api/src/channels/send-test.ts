import type { ChannelConnection, SendResult } from '@alerts/shared';
import type { Db } from '../db/database.ts';
import { finishDelivery, insertPendingTestDelivery } from '../db/deliveries.ts';
import { insertPreview } from '../db/previews.ts';
import type { NotificationChannel, Notification } from './notification-channel.ts';
import { SEND_TIMEOUT_MS, withTimeout } from '../util/with-timeout.ts';

function testNotification(connection: ChannelConnection): Notification {
  return {
    title: 'Test notification from World Alerts',
    summary: `If you can read this, your "${connection.label}" connection works.`,
    sourceLabel: 'World Alerts',
    occurredAt: new Date().toISOString(),
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * "Send test" (A18, DS8): claim a `kind = 'test'` delivery row, send once with the
 * timeout, store the email preview, record the result. Never throws for a send error.
 */
export async function sendTest(
  db: Db,
  userId: string,
  connection: ChannelConnection,
  channel: NotificationChannel,
): Promise<SendResult> {
  const deliveryId = insertPendingTestDelivery(db, userId, connection);
  try {
    const outcome = await withTimeout(
      (signal) => channel.send(testNotification(connection), connection.config, signal),
      SEND_TIMEOUT_MS,
    );
    const previewId = outcome.preview ? insertPreview(db, outcome.preview) : null;
    finishDelivery(db, deliveryId, outcome, previewId);
    return previewId
      ? { status: outcome.status, previewUrl: `/api/previews/${previewId}` }
      : { status: outcome.status };
  } catch (err) {
    const result: SendResult = { status: 'failed', error: errorMessage(err) };
    finishDelivery(db, deliveryId, result, null);
    return result;
  }
}
