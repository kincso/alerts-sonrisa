import { beforeEach, describe, expect, it } from 'vitest';
import type { AlertInput, Event } from '@alerts/shared';
import type { NotificationChannel } from '../channels/notification-channel.ts';
import { createChannelRegistry } from '../channels/registry.ts';
import { insertAlert, setAlertActive } from '../db/alerts.ts';
import { insertConnection } from '../db/connections.ts';
import { openDatabase, type Db } from '../db/database.ts';
import { insertNewEvents } from '../db/events.ts';
import { seed } from '../db/seed.ts';
import { createDispatcher, type Dispatcher } from './dispatcher.ts';

/** A channel that records what it was asked to send; `fail` makes it throw. */
function fakeChannel(type: string, fail = false) {
  const sent: string[] = [];
  const channel: NotificationChannel = {
    type,
    label: type,
    fields: [],
    validate: () => ({}),
    send: (n) => {
      if (fail) return Promise.reject(new Error(`${type} is down`));
      sent.push(n.title);
      return Promise.resolve({ status: 'sent' });
    },
  };
  return { channel, sent };
}

function deliveryRows(db: Db) {
  return db.prepare('SELECT * FROM deliveries ORDER BY connection_label').all();
}

describe('dispatcher', () => {
  let db: Db;
  let ok: ReturnType<typeof fakeChannel>;
  let other: ReturnType<typeof fakeChannel>;
  let broken: ReturnType<typeof fakeChannel>;
  let dispatcher: Dispatcher;
  let connectionIds: { ok: string; other: string; broken: string };

  const quake = (sourceEventId = 'q1', over: Partial<Event> = {}): Event => {
    const [event] = insertNewEvents(db, 'usgs', [
      {
        sourceEventId,
        title: 'M 5.0 - Earthquake near Lima',
        summary: '',
        severity: 'medium',
        occurredAt: '2026-10-18T10:00:00.000Z',
        ...over,
      },
    ]);
    if (!event) throw new Error('event was not inserted');
    return event;
  };

  const alertOn = (connections: string[], over: Partial<AlertInput> = {}) =>
    insertAlert(db, 'alice', {
      name: 'Quakes',
      sourceId: 'usgs',
      keywords: [],
      minSeverity: 'medium',
      connectionIds: connections,
      ...over,
    });

  beforeEach(() => {
    db = openDatabase(':memory:');
    ok = fakeChannel('ok');
    other = fakeChannel('other');
    broken = fakeChannel('broken', true);
    seed(db, ['ok', 'other', 'broken'], [{ id: 'usgs', label: 'USGS' }]);
    db.prepare("UPDATE sources SET enabled_at = '2026-10-01T00:00:00.000Z'").run();
    const connect = (type: string) =>
      insertConnection(db, 'alice', { type, label: type, config: {} }).id;
    connectionIds = { ok: connect('ok'), other: connect('other'), broken: connect('broken') };
    dispatcher = createDispatcher(
      db,
      createChannelRegistry([ok.channel, other.channel, broken.channel]),
    );
  });

  // testing.md S3-8
  it('sends once per linked connection and logs one row each', async () => {
    alertOn([connectionIds.ok, connectionIds.other]);

    const created = await dispatcher.dispatch([quake()]);

    expect(ok.sent).toEqual(['M 5.0 - Earthquake near Lima']);
    expect(other.sent).toHaveLength(1);
    expect(created.map((d) => [d.connectionLabel, d.status, d.alertName])).toEqual([
      ['ok', 'sent', 'Quakes'],
      ['other', 'sent', 'Quakes'],
    ]);
    expect(deliveryRows(db)).toHaveLength(2);
  });

  it('sends nothing for an event that does not match', async () => {
    alertOn([connectionIds.ok], { minSeverity: 'high' });

    expect(await dispatcher.dispatch([quake()])).toEqual([]);
    expect(ok.sent).toEqual([]);
  });

  // testing.md S3-6
  it('ignores a paused alert', async () => {
    setAlertActive(db, alertOn([connectionIds.ok]), false);

    await dispatcher.dispatch([quake()]);

    expect(ok.sent).toEqual([]);
    expect(deliveryRows(db)).toHaveLength(0);
  });

  // testing.md S3-7
  it('never sends the same (alert, event, connection) twice', async () => {
    alertOn([connectionIds.ok]);
    const event = quake();

    await dispatcher.dispatch([event]);
    const again = await dispatcher.dispatch([event]);

    expect(again).toEqual([]);
    expect(ok.sent).toHaveLength(1);
    expect(deliveryRows(db)).toHaveLength(1);
  });

  // testing.md S3-8
  it('skips a channel type the admin disabled', async () => {
    alertOn([connectionIds.ok, connectionIds.other]);
    db.prepare("UPDATE channel_types SET enabled = 0 WHERE type = 'other'").run();

    await dispatcher.dispatch([quake()]);

    expect(other.sent).toEqual([]);
    expect(deliveryRows(db).map((r) => r['connection_label'])).toEqual(['ok']);
  });

  it('skips events from a disabled source', async () => {
    alertOn([connectionIds.ok]);
    db.prepare("UPDATE sources SET enabled = 0 WHERE id = 'usgs'").run();

    await dispatcher.dispatch([quake()]);

    expect(deliveryRows(db)).toHaveLength(0);
  });

  it('skips events from before the source was enabled (D7)', async () => {
    alertOn([connectionIds.ok]);

    await dispatcher.dispatch([quake('old', { occurredAt: '2026-09-30T23:59:59.000Z' })]);

    expect(deliveryRows(db)).toHaveLength(0);
  });

  // testing.md S3-9
  it('logs a failing channel as failed and still sends to the others', async () => {
    alertOn([connectionIds.broken, connectionIds.ok]);

    const created = await dispatcher.dispatch([quake()]);

    expect(ok.sent).toHaveLength(1);
    expect(created.map((d) => [d.connectionLabel, d.status, d.error])).toEqual([
      ['broken', 'failed', 'broken is down'],
      ['ok', 'sent', undefined],
    ]);
  });
});
