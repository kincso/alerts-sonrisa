import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type express from 'express';
import { createApp } from './app.ts';
import { createEmailChannel } from './channels/email.channel.ts';
import { createChannelRegistry } from './channels/registry.ts';
import { slackChannel } from './channels/slack.channel.ts';
import { openDatabase, type Db } from './db/database.ts';
import { seed } from './db/seed.ts';
import { createDispatcher } from './dispatcher/dispatcher.ts';
import { createPoller } from './poller/poller.ts';
import { bbcSource } from './sources/bbc.source.ts';
import { createSourceRegistry } from './sources/registry.ts';
import type { Source } from './sources/source.ts';
import { usgsSource } from './sources/usgs.source.ts';

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

/**
 * The real app with email in log-only mode (no SMTP env) and Slack, wired like
 * server.ts. The poller is created but never started; pass fake `sources` for tests
 * that poll.
 */
export function startTestApp(sources: readonly Source[] = [usgsSource, bbcSource]): TestServer {
  const db = openDatabase(':memory:');
  const channels = createChannelRegistry([createEmailChannel({}), slackChannel]);
  const sourceRegistry = createSourceRegistry(sources);
  seed(
    db,
    channels.all().map((c) => c.type),
    sources,
  );
  const dispatcher = createDispatcher(db, channels);
  const poller = createPoller(db, sourceRegistry, {
    onNewEvents: (events) => dispatcher.dispatch(events),
  });
  return startServer(createApp({ db, channels, sources: sourceRegistry, poller, dispatcher }), db);
}
