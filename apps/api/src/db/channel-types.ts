import { text, type Db } from './database.ts';

export function enabledChannelTypes(db: Db): Set<string> {
  const rows = db.prepare('SELECT type FROM channel_types WHERE enabled = 1').all();
  return new Set(rows.map((row) => text(row, 'type')));
}

/** Every channel type with its admin switch (A9). */
export function listChannelTypes(db: Db): { type: string; enabled: boolean }[] {
  return db
    .prepare('SELECT type, enabled FROM channel_types')
    .all()
    .map((row) => ({ type: text(row, 'type'), enabled: row['enabled'] === 1 }));
}

/** Returns false if the type has no row. */
export function setChannelTypeEnabled(db: Db, type: string, enabled: boolean): boolean {
  const { changes } = db
    .prepare('UPDATE channel_types SET enabled = ? WHERE type = ?')
    .run(enabled ? 1 : 0, type);
  return changes > 0;
}
