import { newId, now, text, type Db } from './database.ts';

export interface EmailPreview {
  subject: string;
  html: string;
}

export function insertPreview(db: Db, preview: EmailPreview): string {
  const id = newId(); // random UUID: the link is public (DS7)
  db.prepare('INSERT INTO email_previews (id, subject, html, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    preview.subject,
    preview.html,
    now(),
  );
  return id;
}

export function findPreview(db: Db, id: string): EmailPreview | undefined {
  const row = db.prepare('SELECT subject, html FROM email_previews WHERE id = ?').get(id);
  return row ? { subject: text(row, 'subject'), html: text(row, 'html') } : undefined;
}
