import { text, type Db } from './database.ts';

export function enabledChannelTypes(db: Db): Set<string> {
  const rows = db.prepare('SELECT type FROM channel_types WHERE enabled = 1').all();
  return new Set(rows.map((row) => text(row, 'type')));
}
