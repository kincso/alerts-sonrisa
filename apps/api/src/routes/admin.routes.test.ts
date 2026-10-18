import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  Alert,
  ApiError,
  ChannelConnection,
  DeliveryView,
  PollResult,
  SimulateEventInput,
  SimulateEventResult,
} from '@alerts/shared';
import type { Source } from '../sources/source.ts';
import { startTestApp, type TestServer } from '../test-support.ts';

const offlineSource: Source = {
  id: 'fake',
  label: 'Fake feed',
  fetchRaw: () =>
    Promise.resolve(
      JSON.stringify([
        {
          sourceEventId: '1',
          title: 'One',
          summary: '',
          severity: 'low',
          occurredAt: '2026-10-17T00:00:00.000Z',
        },
      ]),
    ),
  normalise: (raw) => JSON.parse(raw) as ReturnType<Source['normalise']>,
};

// testing.md S2-9
describe('POST /api/admin/sources/:id/poll', () => {
  let api: TestServer;

  beforeEach(() => {
    api = startTestApp([offlineSource]);
  });

  afterEach(() => {
    api.close();
  });

  const poll = (id: string, user?: string) =>
    api.call(`/api/admin/sources/${id}/poll`, { method: 'POST', user });

  it('polls the source for an admin', async () => {
    const res = await poll('fake', 'admin');

    expect(res.status).toBe(200);
    expect((await res.json()) as PollResult).toEqual({
      sourceId: 'fake',
      status: 'ok',
      fetched: 1,
      inserted: 1,
    });
  });

  it('returns skipped for a disabled source (S2-4)', async () => {
    api.db.prepare("UPDATE sources SET enabled = 0 WHERE id = 'fake'").run();
    const res = await poll('fake', 'admin');

    expect(res.status).toBe(200);
    expect(((await res.json()) as PollResult).status).toBe('skipped');
  });

  it('is 403 for a user, 401 without a header, 404 for an unknown source', async () => {
    expect((await poll('fake', 'alice')).status).toBe(403);
    expect((await poll('fake')).status).toBe(401);
    expect((await poll('nope', 'admin')).status).toBe(404);
  });

  // testing.md S3-14
  it('sends a new matching event from a poll to the alert (A6)', async () => {
    api.db.prepare("UPDATE sources SET enabled_at = '2026-01-01T00:00:00.000Z'").run();
    const connection = (await (
      await api.call('/api/me/connections', {
        user: 'alice',
        method: 'POST',
        body: { type: 'slack', label: 'Team', config: {} },
      })
    ).json()) as ChannelConnection;
    await api.call('/api/me/alerts', {
      user: 'alice',
      method: 'POST',
      body: {
        name: 'Everything',
        sourceId: 'fake',
        keywords: [],
        minSeverity: 'low',
        connectionIds: [connection.id],
      },
    });

    await poll('fake', 'admin');

    const deliveries = (await (
      await api.call('/api/me/deliveries', { user: 'alice' })
    ).json()) as DeliveryView[];
    expect(deliveries.map((d) => [d.event?.title, d.status])).toEqual([['One', 'dry-run']]);
  });
});

// testing.md S3-12
describe('POST /api/admin/simulate-event', () => {
  let api: TestServer;
  let connectionId: string;

  beforeEach(async () => {
    api = startTestApp();
    const res = await api.call('/api/me/connections', {
      user: 'alice',
      method: 'POST',
      body: { type: 'email', label: 'Inbox', config: { to: 'alice@example.com' } },
    });
    connectionId = ((await res.json()) as ChannelConnection).id;
    await api.call('/api/me/alerts', {
      user: 'alice',
      method: 'POST',
      body: {
        name: 'Quakes',
        sourceId: 'usgs',
        keywords: ['quake'],
        minSeverity: 'medium',
        connectionIds: [connectionId],
      },
    });
  });

  afterEach(() => {
    api.close();
  });

  const simulate = (body: Partial<SimulateEventInput>, user = 'admin') =>
    api.call('/api/admin/simulate-event', { user, method: 'POST', body });

  const QUAKE: SimulateEventInput = {
    sourceId: 'usgs',
    title: 'Earthquake near Lima',
    severity: 'high',
    sourceEventId: 'sim-1',
  };

  it('stores the event and returns the deliveries it caused', async () => {
    const res = await simulate(QUAKE);
    const body = (await res.json()) as SimulateEventResult;

    expect(res.status).toBe(200);
    expect(body.event).toMatchObject({
      sourceId: 'usgs',
      sourceEventId: 'sim-1',
      severity: 'high',
    });
    expect(body.deliveries.map((d) => [d.alertName, d.connectionLabel, d.status])).toEqual([
      ['Quakes', 'Inbox', 'sent'],
    ]);
  });

  it('sends nothing the second time for the same sourceEventId (S3-1)', async () => {
    await simulate(QUAKE);
    const again = (await (await simulate(QUAKE)).json()) as SimulateEventResult;

    expect(again.deliveries).toEqual([]);
    expect(api.db.prepare('SELECT * FROM deliveries').all()).toHaveLength(1);
    expect(api.db.prepare('SELECT * FROM events').all()).toHaveLength(1);
  });

  it('generates a sourceEventId when none is given', async () => {
    const body = (await (
      await simulate({ ...QUAKE, sourceEventId: undefined })
    ).json()) as SimulateEventResult;

    expect(body.event.sourceEventId).toMatch(/^sim-[0-9a-f-]{36}$/);
  });

  it('sends nothing for a paused alert', async () => {
    const [alert] = (await (await api.call('/api/me/alerts', { user: 'alice' })).json()) as Alert[];
    await api.call(`/api/me/alerts/${alert?.id ?? ''}`, {
      user: 'alice',
      method: 'PATCH',
      body: { active: false },
    });

    const body = (await (await simulate(QUAKE)).json()) as SimulateEventResult;

    expect(body.deliveries).toEqual([]);
  });

  // testing.md S3-21 (S3 review M2, decisions.md S3-2)
  it("accepts only the source's fixed severity when it has one", async () => {
    const news = { sourceId: 'bbc', title: 'Floods in Peru' } as const;

    const high = await simulate({ ...news, severity: 'high' });
    expect(high.status).toBe(400);
    expect(((await high.json()) as ApiError).fieldErrors).toEqual({
      severity: 'Items from BBC World News are always medium.',
    });

    const medium = await simulate({ ...news, severity: 'medium' });
    expect(medium.status).toBe(200);
    expect(((await medium.json()) as SimulateEventResult).event.severity).toBe('medium');
  });

  it('returns 400 field errors, 403 for a user and 401 without a header', async () => {
    const bad = await simulate({ sourceId: 'nasa', severity: undefined });
    expect(bad.status).toBe(400);
    expect(Object.keys(((await bad.json()) as ApiError).fieldErrors ?? {}).sort()).toEqual([
      'severity',
      'sourceId',
      'title',
    ]);
    expect((await simulate(QUAKE, 'alice')).status).toBe(403);
    expect(
      (await api.call('/api/admin/simulate-event', { method: 'POST', body: QUAKE })).status,
    ).toBe(401);
  });
});
