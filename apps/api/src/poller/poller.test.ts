import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openDatabase, type Db } from '../db/database.ts';
import { seed } from '../db/seed.ts';
import { createSourceRegistry } from '../sources/registry.ts';
import type { NewEvent, Source } from '../sources/source.ts';
import { createPoller } from './poller.ts';

function item(sourceEventId: string): NewEvent {
  return {
    sourceEventId,
    title: `Item ${sourceEventId}`,
    summary: '',
    severity: 'low',
    occurredAt: '2026-10-17T12:00:00.000Z',
  };
}

/** A source whose feed is whatever `items` holds; `fail` makes the fetch throw. */
function fakeSource(id: string) {
  const state = { items: [item('1'), item('2')], fail: false, fetches: 0 };
  const source: Source = {
    id,
    label: id,
    fetchRaw: () => {
      state.fetches++;
      return state.fail
        ? Promise.reject(new Error('feed down'))
        : Promise.resolve(JSON.stringify(state.items));
    },
    normalise: (raw) => JSON.parse(raw) as NewEvent[],
  };
  return { source, state };
}

/** A feed response the test settles by hand. */
function deferred() {
  let resolve: (raw: string) => void = () => undefined;
  const promise = new Promise<string>((r) => (resolve = r));
  return { promise, resolve };
}

function sourceRow(db: Db, id: string) {
  return db.prepare('SELECT last_poll_at, last_error FROM sources WHERE id = ?').get(id);
}

function eventCount(db: Db, sourceId: string): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM events WHERE source_id = ?').get(sourceId);
  return Number(row?.['n']);
}

describe('poller', () => {
  let db: Db;
  let a: ReturnType<typeof fakeSource>;
  let b: ReturnType<typeof fakeSource>;
  let poller: ReturnType<typeof createPoller>;

  beforeEach(() => {
    db = openDatabase(':memory:');
    a = fakeSource('a');
    b = fakeSource('b');
    seed(db, [], [a.source, b.source]);
    poller = createPoller(db, createSourceRegistry([a.source, b.source]), { timeoutMs: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stores normalised items and reports the counts', async () => {
    const result = await poller.pollSource(a.source);

    expect(result).toEqual({ sourceId: 'a', status: 'ok', fetched: 2, inserted: 2 });
    expect(eventCount(db, 'a')).toBe(2);
    expect(sourceRow(db, 'a')).toMatchObject({ last_error: null });
    expect(sourceRow(db, 'a')?.['last_poll_at']).toEqual(expect.any(String));
  });

  // testing.md S2-6
  it('does not store an item twice', async () => {
    await poller.pollSource(a.source);
    a.state.items.push(item('3'));
    const second = await poller.pollSource(a.source);

    expect(second).toMatchObject({ fetched: 3, inserted: 1 });
    expect(eventCount(db, 'a')).toBe(3);
  });

  it('keeps the same sourceEventId apart per source', async () => {
    await poller.pollAll();
    expect(eventCount(db, 'a')).toBe(2);
    expect(eventCount(db, 'b')).toBe(2);
  });

  // testing.md S2-7
  it('records a failure, keeps polling the other source, and clears it on success', async () => {
    a.state.fail = true;
    const results = await poller.pollAll();

    expect(results).toEqual([
      { sourceId: 'a', status: 'failed', fetched: 0, inserted: 0, error: 'feed down' },
      { sourceId: 'b', status: 'ok', fetched: 2, inserted: 2 },
    ]);
    expect(sourceRow(db, 'a')).toMatchObject({ last_error: 'feed down' });

    a.state.fail = false;
    await poller.pollSource(a.source);
    expect(sourceRow(db, 'a')).toMatchObject({ last_error: null });
  });

  it('records a feed that cannot be parsed as a failure', async () => {
    a.source.normalise = () => {
      throw new Error('not RSS');
    };
    const result = await poller.pollSource(a.source);

    expect(result).toMatchObject({ status: 'failed', error: 'not RSS' });
    expect(sourceRow(db, 'a')).toMatchObject({ last_error: 'not RSS' });
  });

  it('fails a fetch that takes longer than the timeout', async () => {
    vi.useFakeTimers();
    const neverSettles = deferred().promise;
    a.source.fetchRaw = () => neverSettles;
    const pending = poller.pollSource(a.source);
    await vi.advanceTimersByTimeAsync(1000);

    expect(await pending).toMatchObject({ status: 'failed', error: 'Timed out after 1s' });
  });

  // testing.md S2-8
  it('skips a disabled source without fetching', async () => {
    db.prepare("UPDATE sources SET enabled = 0 WHERE id = 'a'").run();
    const result = await poller.pollSource(a.source);

    expect(result).toEqual({ sourceId: 'a', status: 'skipped', fetched: 0, inserted: 0 });
    expect(a.state.fetches).toBe(0);
  });

  it('skips a source whose previous poll is still running', async () => {
    const feed = deferred();
    a.source.fetchRaw = () => feed.promise;
    const first = poller.pollSource(a.source);
    const second = await poller.pollSource(a.source);
    feed.resolve('[]');

    expect(second.status).toBe('skipped');
    expect((await first).status).toBe('ok');

    a.source.fetchRaw = () => Promise.resolve('[]');
    expect((await poller.pollSource(a.source)).status).toBe('ok'); // the lock was released
  });

  it('polls every source on each interval tick until stopped', async () => {
    vi.useFakeTimers();
    const stop = poller.start(15_000);
    await vi.advanceTimersByTimeAsync(0);
    expect(a.state.fetches).toBe(1); // first poll right away

    await vi.advanceTimersByTimeAsync(15_000);
    expect(a.state.fetches).toBe(2);
    expect(b.state.fetches).toBe(2);

    stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(a.state.fetches).toBe(2);
  });

  // testing.md S3-14
  it('hands only newly stored events to onNewEvents', async () => {
    const received: string[][] = [];
    const notifying = createPoller(db, createSourceRegistry([a.source]), {
      onNewEvents: (events) => {
        received.push(events.map((e) => e.sourceEventId));
        return Promise.resolve();
      },
    });

    await notifying.pollSource(a.source);
    await notifying.pollSource(a.source); // nothing new: no call
    a.state.items.push(item('3'));
    await notifying.pollSource(a.source);

    expect(received).toEqual([['1', '2'], ['3']]);
  });

  // testing.md S3-20 (S3 review M1)
  it('stores nothing from a cycle that fails partway, so the next cycle dispatches all of it', async () => {
    const received: string[][] = [];
    const notifying = createPoller(db, createSourceRegistry([a.source]), {
      onNewEvents: (events) => {
        received.push(events.map((e) => e.sourceEventId));
        return Promise.resolve();
      },
    });
    // The second item breaks NOT NULL after the first was inserted.
    const valid = a.source.fetchRaw;
    a.source.fetchRaw = () =>
      Promise.resolve(JSON.stringify([item('1'), { ...item('2'), title: null }]));

    const failed = await notifying.pollSource(a.source);
    expect(failed.status).toBe('failed');
    expect(eventCount(db, 'a')).toBe(0);

    a.source.fetchRaw = valid;
    await notifying.pollSource(a.source);
    expect(received).toEqual([['1', '2']]);
  });

  it('keeps the poll ok when onNewEvents fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const notifying = createPoller(db, createSourceRegistry([a.source]), {
      onNewEvents: () => Promise.reject(new Error('dispatch broke')),
    });

    const result = await notifying.pollSource(a.source);

    expect(result.status).toBe('ok');
    expect(sourceRow(db, 'a')).toMatchObject({ last_error: null });
  });
});
