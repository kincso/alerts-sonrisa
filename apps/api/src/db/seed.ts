import type { User } from '@alerts/shared';
import { now, type Db } from './database.ts';

/** Mock users for the "Acting as" switcher (A8). Fixed IDs so the web can remember them. */
const USERS: User[] = [
  { id: 'alice', name: 'Alice', email: 'alice@example.com', role: 'user' },
  { id: 'bob', name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'admin' },
];

/**
 * Idempotent: safe to run on every start. Channel types and sources come from their
 * registries. A source's enabled_at (the D7 baseline) is set only when it is first seeded.
 */
export function seed(
  db: Db,
  channelTypes: readonly string[],
  sources: readonly { id: string; label: string }[],
): void {
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
  );
  for (const u of USERS) insertUser.run(u.id, u.name, u.email, u.role);

  const insertType = db.prepare('INSERT OR IGNORE INTO channel_types (type) VALUES (?)');
  for (const type of channelTypes) insertType.run(type);

  const insertSource = db.prepare(
    'INSERT OR IGNORE INTO sources (id, label, enabled_at) VALUES (?, ?, ?)',
  );
  for (const s of sources) insertSource.run(s.id, s.label, now());
}
