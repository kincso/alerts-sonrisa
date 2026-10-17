import type { Role, User, UserSummary } from '@alerts/shared';
import { text, type Db, type Row } from './database.ts';

function toRole(value: string): Role {
  return value === 'admin' ? 'admin' : 'user';
}

function toUser(row: Row): User {
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    email: text(row, 'email'),
    role: toRole(text(row, 'role')),
  };
}

export function findUser(db: Db, id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return row ? toUser(row) : undefined;
}

/** Users first, admin last. */
export function listUsers(db: Db): UserSummary[] {
  return db
    .prepare("SELECT * FROM users ORDER BY role = 'admin', name")
    .all()
    .map(toUser)
    .map(({ id, name, role }) => ({ id, name, role }));
}
