import type { ChannelConnection, SendResult } from '@alerts/shared';
import type { Db } from '../db/database.ts';
import { insertPendingTestDelivery } from '../db/deliveries.ts';
import { deliver } from './deliver.ts';
import type { NotificationChannel, Notification } from './notification-channel.ts';

function testNotification(connection: ChannelConnection): Notification {
  return {
    title: 'Test notification from World Alerts',
    summary: `If you can read this, your "${connection.label}" connection works.`,
    sourceLabel: 'World Alerts',
    occurredAt: new Date().toISOString(),
  };
}

/**
 * "Send test" (A18, DS8): claim a `kind = 'test'` delivery row, then send once and
 * record it like any delivery. Never throws for a send error.
 */
export function sendTest(
  db: Db,
  userId: string,
  connection: ChannelConnection,
  channel: NotificationChannel,
): Promise<SendResult> {
  const deliveryId = insertPendingTestDelivery(db, userId, connection);
  return deliver(db, deliveryId, channel, testNotification(connection), connection.config);
}
