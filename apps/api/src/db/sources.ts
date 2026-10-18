import { now, optionalText, text, type Db, type Row } from './database.ts';

export interface SourceRow {
  id: string;
  label: string;
  enabled: boolean;
  enabledAt: string;
}

/** A source row plus its poll status, for the admin's source health (A9). */
export interface SourceHealthRow extends SourceRow {
  lastPollAt?: string;
  lastError?: string;
}

function toSourceRow(row: Row): SourceRow {
  return {
    id: text(row, 'id'),
    label: text(row, 'label'),
    enabled: row['enabled'] === 1,
    enabledAt: text(row, 'enabled_at'),
  };
}

function toHealthRow(row: Row): SourceHealthRow {
  const lastPollAt = optionalText(row, 'last_poll_at');
  const lastError = optionalText(row, 'last_error');
  return {
    ...toSourceRow(row),
    ...(lastPollAt ? { lastPollAt } : {}),
    ...(lastError ? { lastError } : {}),
  };
}

export function findSource(db: Db, id: string): SourceRow | undefined {
  const row = db.prepare('SELECT id, label, enabled, enabled_at FROM sources WHERE id = ?').get(id);
  return row ? toSourceRow(row) : undefined;
}

export function listSources(db: Db): SourceRow[] {
  return db
    .prepare('SELECT id, label, enabled, enabled_at FROM sources ORDER BY label')
    .all()
    .map(toSourceRow);
}

export function listSourceHealth(db: Db): SourceHealthRow[] {
  return db.prepare('SELECT * FROM sources ORDER BY label').all().map(toHealthRow);
}

export function findSourceHealth(db: Db, id: string): SourceHealthRow | undefined {
  const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
  return row ? toHealthRow(row) : undefined;
}

/**
 * Turning a disabled source on moves its D7 baseline to now; any other change leaves
 * enabled_at alone (decisions.md S4-3). In SQLite's SET, `enabled` is the old value.
 * Returns false if the source has no row.
 */
export function setSourceEnabled(db: Db, id: string, enabled: boolean): boolean {
  const { changes } = db
    .prepare(
      `UPDATE sources
       SET enabled_at = CASE WHEN enabled = 0 AND ? = 1 THEN ? ELSE enabled_at END,
           enabled = ?
       WHERE id = ?`,
    )
    .run(enabled ? 1 : 0, now(), enabled ? 1 : 0, id);
  return changes > 0;
}

/** Every poll attempt sets last_poll_at; a success clears last_error. */
export function recordPoll(db: Db, id: string, error: string | null): void {
  db.prepare('UPDATE sources SET last_poll_at = ?, last_error = ? WHERE id = ?').run(
    now(),
    error,
    id,
  );
}
