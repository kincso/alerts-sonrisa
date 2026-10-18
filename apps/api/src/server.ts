import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { createEmailChannel } from './channels/email.channel.ts';
import { createChannelRegistry } from './channels/registry.ts';
import { slackChannel } from './channels/slack.channel.ts';
import { openDatabase } from './db/database.ts';
import { createDispatcher } from './dispatcher/dispatcher.ts';
import { seed } from './db/seed.ts';
import { createPoller } from './poller/poller.ts';
import { bbcSource } from './sources/bbc.source.ts';
import { createSourceRegistry } from './sources/registry.ts';
import { usgsSource } from './sources/usgs.source.ts';

// Optional root .env (SMTP_*, DB_PATH, PORT, POLL_INTERVAL_MS); see .env.example.
const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const port = Number(process.env['PORT'] ?? 3000);
const dbPath =
  process.env['DB_PATH'] ?? fileURLToPath(new URL('../data/alerts.db', import.meta.url));

// A5: 3 minutes by default (decisions.md S2-3).
const pollIntervalMs = Number(process.env['POLL_INTERVAL_MS'] ?? 180_000);
if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1000) {
  throw new Error('POLL_INTERVAL_MS must be a number of milliseconds, at least 1000.');
}

const channels = createChannelRegistry([createEmailChannel(process.env), slackChannel]);
const sources = createSourceRegistry([usgsSource, bbcSource]);
const db = openDatabase(dbPath);
seed(
  db,
  channels.all().map((c) => c.type),
  sources.all(),
);
const dispatcher = createDispatcher(db, channels);
// A6: matches are sent right after each poll stores them.
const poller = createPoller(db, sources, { onNewEvents: (events) => dispatcher.dispatch(events) });

createApp({ db, channels, sources, poller, dispatcher }).listen(port, () => {
  console.log(`API listening on http://localhost:${port} (database: ${dbPath})`);
  console.log(`Polling ${sources.all().length} sources every ${pollIntervalMs / 1000}s`);
  poller.start(pollIntervalMs);
});
