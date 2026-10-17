import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type express from 'express';
import { createApp } from './app.ts';
import { createEmailChannel } from './channels/email.channel.ts';
import { createChannelRegistry } from './channels/registry.ts';
import { slackChannel } from './channels/slack.channel.ts';
import { openDatabase, type Db } from './db/database.ts';
import { seed } from './db/seed.ts';

export interface TestServer {
  db: Db;
  close(): void;
  /** `user` sets X-User-Id; omit it to send no header. */
  call(path: string, init?: { user?: string; method?: string; body?: unknown }): Promise<Response>;
}

/** Starts an app on a random port, backed by an in-memory, seeded database. */
export function startServer(app: express.Express, db: Db): TestServer {
  const server: Server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  return {
    db,
    close: () => server.close(),
    call: (path, init = {}) =>
      fetch(`http://localhost:${port}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(init.user ? { 'X-User-Id': init.user } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      }),
  };
}

/** The real app with email in log-only mode (no SMTP env) and Slack. */
export function startTestApp(): TestServer {
  const db = openDatabase(':memory:');
  const channels = createChannelRegistry([createEmailChannel({}), slackChannel]);
  seed(
    db,
    channels.all().map((c) => c.type),
  );
  return startServer(createApp({ db, channels }), db);
}
