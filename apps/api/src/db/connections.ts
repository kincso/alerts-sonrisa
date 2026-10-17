import type { ChannelConfig, ChannelConnection, ConnectionInput } from '@alerts/shared';
import { newId, now, text, type Db, type Row } from './database.ts';

function parseConfig(json: string): ChannelConfig {
  const parsed: unknown = JSON.parse(json);
  const config: ChannelConfig = {};
  if (parsed && typeof parsed === 'object') {
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') config[key] = value;
    }
  }
  return config;
}

function toConnection(row: Row): ChannelConnection {
  return {
    id: text(row, 'id'),
    type: text(row, 'type'),
    label: text(row, 'label'),
    config: parseConfig(text(row, 'config')),
    createdAt: text(row, 'created_at'),
  };
}

export function listConnections(db: Db, userId: string): ChannelConnection[] {
  return db
    .prepare('SELECT * FROM channel_connections WHERE user_id = ? ORDER BY created_at')
    .all(userId)
    .map(toConnection);
}

/** Scoped to the owner: another user's connection is "not found". */
export function findConnection(db: Db, userId: string, id: string): ChannelConnection | undefined {
  const row = db
    .prepare('SELECT * FROM channel_connections WHERE id = ? AND user_id = ?')
    .get(id, userId);
  return row ? toConnection(row) : undefined;
}

export function insertConnection(
  db: Db,
  userId: string,
  input: ConnectionInput,
): ChannelConnection {
  const connection: ChannelConnection = { id: newId(), createdAt: now(), ...input };
  db.prepare(
    `INSERT INTO channel_connections (id, user_id, type, label, config, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    connection.id,
    userId,
    connection.type,
    connection.label,
    JSON.stringify(connection.config),
    connection.createdAt,
  );
  return connection;
}

/** `type` is never updated (DS12). */
export function updateConnection(
  db: Db,
  existing: ChannelConnection,
  input: ConnectionInput,
): ChannelConnection {
  db.prepare('UPDATE channel_connections SET label = ?, config = ? WHERE id = ?').run(
    input.label,
    JSON.stringify(input.config),
    existing.id,
  );
  return { ...existing, label: input.label, config: input.config };
}

export function deleteConnection(db: Db, id: string): void {
  db.prepare('DELETE FROM channel_connections WHERE id = ?').run(id);
}
