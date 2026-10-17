import type { ChannelConnection, SendResult } from '@alerts/shared';
import { newId, now, type Db } from './database.ts';

/** Claims a `pending` test delivery row (DS8) before sending. Returns its id. */
export function insertPendingTestDelivery(
  db: Db,
  userId: string,
  connection: ChannelConnection,
): string {
  const id = newId();
  db.prepare(
    `INSERT INTO deliveries
       (id, kind, user_id, connection_id, connection_label, channel_type, status, created_at)
     VALUES (?, 'test', ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, userId, connection.id, connection.label, connection.type, now());
  return id;
}

export function finishDelivery(
  db: Db,
  id: string,
  result: Pick<SendResult, 'status' | 'error'>,
  previewId: string | null,
): void {
  db.prepare('UPDATE deliveries SET status = ?, error = ?, preview_id = ? WHERE id = ?').run(
    result.status,
    result.error ?? null,
    previewId,
    id,
  );
}
