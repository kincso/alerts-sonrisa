import { now, text, type Db, type Row } from './database.ts';

export interface SourceRow {
  id: string;
  enabled: boolean;
  enabledAt: string;
}

function toSourceRow(row: Row): SourceRow {
  return { id: text(row, 'id'), enabled: row['enabled'] === 1, enabledAt: text(row, 'enabled_at') };
}

export function findSource(db: Db, id: string): SourceRow | undefined {
  const row = db.prepare('SELECT id, enabled, enabled_at FROM sources WHERE id = ?').get(id);
  return row ? toSourceRow(row) : undefined;
}

/** Every poll attempt sets last_poll_at; a success clears last_error. */
export function recordPoll(db: Db, id: string, error: string | null): void {
  db.prepare('UPDATE sources SET last_poll_at = ?, last_error = ? WHERE id = ?').run(
    now(),
    error,
    id,
  );
}
