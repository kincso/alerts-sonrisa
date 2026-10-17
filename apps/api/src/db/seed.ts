import type { User } from '@alerts/shared';
import type { Db } from './database.ts';

/** Mock users for the "Acting as" switcher (A8). Fixed IDs so the web can remember them. */
const USERS: User[] = [
  { id: 'alice', name: 'Alice', email: 'alice@example.com', role: 'user' },
  { id: 'bob', name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'admin' },
];

/** Idempotent: safe to run on every start. Channel types come from the registry. */
export function seed(db: Db, channelTypes: readonly string[]): void {
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
  );
  for (const u of USERS) insertUser.run(u.id, u.name, u.email, u.role);

  const insertType = db.prepare('INSERT OR IGNORE INTO channel_types (type) VALUES (?)');
  for (const type of channelTypes) insertType.run(type);
}
