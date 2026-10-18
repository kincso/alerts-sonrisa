import {
  type AdminDeliveryView,
  type ChannelConnection,
  type DeliveryStatus,
  type DeliveryView,
  type SendResult,
} from '@alerts/shared';
import { newId, now, optionalText, severity, text, type Db, type Row } from './database.ts';

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

export interface AlertDeliveryClaim {
  userId: string;
  alert: { id: string; name: string };
  eventId: string;
  connection: ChannelConnection;
}

/**
 * Claims a `pending` alert delivery row before sending (design.md §3). Returns its id,
 * or undefined if (alert, event, connection) already has a row: never send twice (A7).
 */
export function claimAlertDelivery(db: Db, claim: AlertDeliveryClaim): string | undefined {
  const id = newId();
  const { changes } = db
    .prepare(
      `INSERT INTO deliveries
         (id, kind, user_id, alert_id, event_id, connection_id, alert_name,
          connection_label, channel_type, status, created_at)
       VALUES (?, 'alert', ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
       ON CONFLICT (alert_id, event_id, connection_id) DO NOTHING`,
    )
    .run(
      id,
      claim.userId,
      claim.alert.id,
      claim.eventId,
      claim.connection.id,
      claim.alert.name,
      claim.connection.label,
      claim.connection.type,
      now(),
    );
  return changes > 0 ? id : undefined;
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

const DELIVERY_STATUSES: readonly DeliveryStatus[] = ['pending', 'sent', 'dry-run', 'failed'];

const SELECT_VIEW = `
  SELECT d.*, e.source_id, e.title, e.url, e.severity, e.occurred_at, u.name AS user_name
  FROM deliveries d
  LEFT JOIN events e ON e.id = d.event_id
  JOIN users u ON u.id = d.user_id`;

function eventOf(row: Row): DeliveryView['event'] {
  const id = optionalText(row, 'event_id');
  if (!id) return undefined;
  return {
    id,
    sourceId: text(row, 'source_id'),
    title: text(row, 'title'),
    url: optionalText(row, 'url'),
    severity: severity(row, 'severity'),
    occurredAt: text(row, 'occurred_at'),
  };
}

function toView(row: Row): DeliveryView {
  const previewId = optionalText(row, 'preview_id');
  return {
    id: text(row, 'id'),
    kind: row['kind'] === 'test' ? 'test' : 'alert',
    alertName: optionalText(row, 'alert_name'),
    connectionLabel: text(row, 'connection_label'),
    channelType: text(row, 'channel_type'),
    status: DELIVERY_STATUSES.find((s) => s === row['status']) ?? 'failed',
    error: optionalText(row, 'error'),
    previewUrl: previewId ? `/api/previews/${previewId}` : undefined,
    event: eventOf(row),
    createdAt: text(row, 'created_at'),
  };
}

/** The user's history (A17), newest first. */
export function listUserDeliveries(db: Db, userId: string): DeliveryView[] {
  return db
    .prepare(`${SELECT_VIEW} WHERE d.user_id = ? ORDER BY d.created_at DESC, d.rowid DESC`)
    .all(userId)
    .map(toView);
}

export function findDeliveryView(db: Db, id: string): DeliveryView | undefined {
  const row = db.prepare(`${SELECT_VIEW} WHERE d.id = ?`).get(id);
  return row ? toView(row) : undefined;
}

/** The whole log for the admin (A9, A16), newest first, with each row's user. */
export function listAllDeliveries(db: Db): AdminDeliveryView[] {
  return db
    .prepare(`${SELECT_VIEW} ORDER BY d.created_at DESC, d.rowid DESC`)
    .all()
    .map((row) => ({ ...toView(row), userName: text(row, 'user_name') }));
}
