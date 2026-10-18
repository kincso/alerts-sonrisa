import { SEVERITIES, type Severity } from '@alerts/shared';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';

export type Db = DatabaseSync;
export type Row = Record<string, SQLOutputValue>;

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

/** Opens (or creates) the database and applies the schema. Use ':memory:' in tests. */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON'); // SQLite leaves FKs off by default
  db.exec(schema);
  return db;
}

/** Reads a TEXT column; throws if the schema and the code disagree. */
export function text(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') throw new Error(`Column "${column}" is not text`);
  return value;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

/** Reads a nullable TEXT column; NULL becomes undefined. */
export function optionalText(row: Row, column: string): string | undefined {
  return row[column] === null ? undefined : text(row, column);
}

/** Runs `fn` in one transaction: all of its writes land, or none do. */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Reads a severity column (the schema's CHECK keeps it valid). */
export function severity(row: Row, column: string): Severity {
  const value = row[column];
  const found = SEVERITIES.find((s) => s === value);
  if (!found) throw new Error(`Column "${column}" is not a severity`);
  return found;
}
