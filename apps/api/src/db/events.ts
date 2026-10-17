import type { Event } from '@alerts/shared';
import type { NewEvent } from '../sources/source.ts';
import { newId, now, type Db } from './database.ts';

/**
 * Stores events, skipping any already stored for (source_id, source_event_id) (A7).
 * Returns only the rows that were actually inserted.
 */
export function insertNewEvents(db: Db, sourceId: string, events: readonly NewEvent[]): Event[] {
  const insert = db.prepare(
    `INSERT INTO events
       (id, source_id, source_event_id, title, summary, url, severity, occurred_at, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (source_id, source_event_id) DO NOTHING`,
  );
  const inserted: Event[] = [];
  for (const e of events) {
    const event: Event = { ...e, id: newId(), sourceId, receivedAt: now() };
    const { changes } = insert.run(
      event.id,
      sourceId,
      e.sourceEventId,
      e.title,
      e.summary,
      e.url ?? null,
      e.severity,
      e.occurredAt,
      event.receivedAt,
    );
    if (changes > 0) inserted.push(event);
  }
  return inserted;
}
