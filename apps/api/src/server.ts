import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { createEmailChannel } from './channels/email.channel.ts';
import { createChannelRegistry } from './channels/registry.ts';
import { slackChannel } from './channels/slack.channel.ts';
import { openDatabase } from './db/database.ts';
import { seed } from './db/seed.ts';

// Optional root .env (SMTP_*, DB_PATH, PORT); see .env.example.
const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const port = Number(process.env['PORT'] ?? 3000);
const dbPath =
  process.env['DB_PATH'] ?? fileURLToPath(new URL('../data/alerts.db', import.meta.url));

const channels = createChannelRegistry([createEmailChannel(process.env), slackChannel]);
const db = openDatabase(dbPath);
seed(
  db,
  channels.all().map((c) => c.type),
);

createApp({ db, channels }).listen(port, () => {
  console.log(`API listening on http://localhost:${port} (database: ${dbPath})`);
});
