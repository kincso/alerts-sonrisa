import type { Alert, AlertInput } from '@alerts/shared';
import { newId, now, severity, text, transaction, type Db, type Row } from './database.ts';

/** An alert plus its owner: what the dispatcher needs to write delivery rows. */
export type OwnedAlert = Alert & { userId: string };

function parseKeywords(json: string): string[] {
  const parsed: unknown = JSON.parse(json);
  return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
}

function connectionIdsOf(db: Db, alertId: string): string[] {
  return db
    .prepare('SELECT connection_id FROM alert_connections WHERE alert_id = ? ORDER BY rowid')
    .all(alertId)
    .map((row) => text(row, 'connection_id'));
}

function toAlert(db: Db, row: Row): OwnedAlert {
  const id = text(row, 'id');
  return {
    id,
    userId: text(row, 'user_id'),
    name: text(row, 'name'),
    sourceId: text(row, 'source_id'),
    keywords: parseKeywords(text(row, 'keywords')),
    minSeverity: severity(row, 'min_severity'),
    active: row['active'] === 1,
    connectionIds: connectionIdsOf(db, id),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
  };
}

/** Drops the owner id before an alert goes out over /me/alerts. */
export function withoutOwner(alert: OwnedAlert): Alert {
  const { id, name, sourceId, keywords, minSeverity, active, connectionIds } = alert;
  const { createdAt, updatedAt } = alert;
  return { id, name, sourceId, keywords, minSeverity, active, connectionIds, createdAt, updatedAt };
}

function linkConnections(db: Db, alertId: string, connectionIds: readonly string[]): void {
  db.prepare('DELETE FROM alert_connections WHERE alert_id = ?').run(alertId);
  const insert = db.prepare(
    'INSERT INTO alert_connections (alert_id, connection_id) VALUES (?, ?)',
  );
  for (const connectionId of connectionIds) insert.run(alertId, connectionId);
}

export function listAlerts(db: Db, userId: string): OwnedAlert[] {
  return db
    .prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at')
    .all(userId)
    .map((row) => toAlert(db, row));
}

/** Scoped to the owner: another user's alert is "not found". */
export function findAlert(db: Db, userId: string, id: string): OwnedAlert | undefined {
  const row = db.prepare('SELECT * FROM alerts WHERE id = ? AND user_id = ?').get(id, userId);
  return row ? toAlert(db, row) : undefined;
}

export function activeAlertsForSource(db: Db, sourceId: string): OwnedAlert[] {
  return db
    .prepare('SELECT * FROM alerts WHERE source_id = ? AND active = 1')
    .all(sourceId)
    .map((row) => toAlert(db, row));
}

export function insertAlert(db: Db, userId: string, input: AlertInput): OwnedAlert {
  const alert: OwnedAlert = {
    ...input,
    id: newId(),
    userId,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  };
  transaction(db, () => {
    db.prepare(
      `INSERT INTO alerts
         (id, user_id, name, source_id, keywords, min_severity, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(
      alert.id,
      userId,
      alert.name,
      alert.sourceId,
      JSON.stringify(alert.keywords),
      alert.minSeverity,
      alert.createdAt,
      alert.updatedAt,
    );
    linkConnections(db, alert.id, alert.connectionIds);
  });
  return alert;
}

export function updateAlert(db: Db, existing: OwnedAlert, input: AlertInput): OwnedAlert {
  const updated: OwnedAlert = { ...existing, ...input, updatedAt: now() };
  transaction(db, () => {
    db.prepare(
      `UPDATE alerts SET name = ?, source_id = ?, keywords = ?, min_severity = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      updated.name,
      updated.sourceId,
      JSON.stringify(updated.keywords),
      updated.minSeverity,
      updated.updatedAt,
      existing.id,
    );
    linkConnections(db, existing.id, updated.connectionIds);
  });
  return updated;
}

export function setAlertActive(db: Db, existing: OwnedAlert, active: boolean): OwnedAlert {
  const updated: OwnedAlert = { ...existing, active, updatedAt: now() };
  db.prepare('UPDATE alerts SET active = ?, updated_at = ? WHERE id = ?').run(
    active ? 1 : 0,
    updated.updatedAt,
    existing.id,
  );
  return updated;
}

/** `alert_connections` rows go with it (ON DELETE CASCADE); deliveries keep a snapshot (DS5). */
export function deleteAlert(db: Db, id: string): void {
  db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
}

/** The alerts that block deleting a connection (D6, DS4). */
export function alertsUsingConnection(
  db: Db,
  connectionId: string,
): { id: string; name: string }[] {
  return db
    .prepare(
      `SELECT a.id, a.name FROM alerts a
       JOIN alert_connections ac ON ac.alert_id = a.id
       WHERE ac.connection_id = ? ORDER BY a.name`,
    )
    .all(connectionId)
    .map((row) => ({ id: text(row, 'id'), name: text(row, 'name') }));
}
