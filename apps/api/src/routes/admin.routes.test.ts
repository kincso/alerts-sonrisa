import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  AdminAlertView,
  AdminDeliveryView,
  Alert,
  ApiError,
  ChannelConnection,
  ChannelDescriptor,
  ChannelTypeSummary,
  DeliveryView,
  PollResult,
  SimulateEventInput,
  SimulateEventResult,
  SourceHealth,
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

// testing.md S4-1 to S4-6 (A9)
describe('admin views and switches (S4)', () => {
  let api: TestServer;

  afterEach(() => {
    api.close();
  });

  const connect = async (user: string, body: Record<string, unknown>) =>
    (
      (await (
        await api.call('/api/me/connections', { user, method: 'POST', body })
      ).json()) as ChannelConnection
    ).id;

  const email = (user: string, label: string) =>
    connect(user, { type: 'email', label, config: { to: `${user}@example.com` } });

  const slack = (user: string, label: string) =>
    connect(user, { type: 'slack', label, config: {} });

  const createAlert = (user: string, name: string, sourceId: string, connectionIds: string[]) =>
    api.call('/api/me/alerts', {
      user,
      method: 'POST',
      body: { name, sourceId, keywords: [], minSeverity: 'low', connectionIds },
    });

  const simulate = (sourceEventId: string) =>
    api.call('/api/admin/simulate-event', {
      user: 'admin',
      method: 'POST',
      body: { sourceId: 'usgs', title: 'Quake', severity: 'high', sourceEventId },
    });

  const patch = (path: string, body: unknown) =>
    api.call(path, { user: 'admin', method: 'PATCH', body });

  async function getJson<T>(path: string, user = 'admin'): Promise<T> {
    return (await (await api.call(path, { user })).json()) as T;
  }

  describe('with the real sources', () => {
    beforeEach(() => {
      api = startTestApp();
    });

    // S4-1
    it('is 200 for an admin, 403 for a user and 401 without a header', async () => {
      const endpoints: [string, string, unknown?][] = [
        ['GET', '/api/admin/alerts'],
        ['GET', '/api/admin/deliveries'],
        ['GET', '/api/admin/sources'],
        ['GET', '/api/admin/channels'],
        ['PATCH', '/api/admin/sources/usgs', { enabled: true }],
        ['PATCH', '/api/admin/channels/email', { enabled: true }],
      ];
      for (const [method, path, body] of endpoints) {
        const status = async (user?: string) =>
          (await api.call(path, { method, body, user })).status;
        expect([path, await status('admin')]).toEqual([path, 200]);
        expect([path, await status('alice')]).toEqual([path, 403]);
        expect([path, await status()]).toEqual([path, 401]);
      }
    });

    // S4-2 (decisions.md S4-2)
    it("lists every user's alerts with the owner and connection labels", async () => {
      const inbox = await email('alice', 'Inbox');
      const team = await slack('alice', 'Team');
      const bobInbox = await email('bob', 'Bob inbox');
      await createAlert('alice', 'Quakes', 'usgs', [inbox, team]);
      await createAlert('bob', 'News', 'bbc', [bobInbox]);

      const alerts = await getJson<AdminAlertView[]>('/api/admin/alerts');
      const rows = alerts.map((a) => [a.name, a.ownerName, a.sourceId, a.connectionLabels]);

      expect(rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual([
        ['News', 'Bob', 'bbc', ['Bob inbox']],
        ['Quakes', 'Alice', 'usgs', ['Inbox', 'Team']],
      ]);
    });

    // S4-3 (decisions.md S4-2)
    it('lists every delivery, newest first, with the user name', async () => {
      await createAlert('alice', 'Quakes', 'usgs', [await email('alice', 'Inbox')]);
      await simulate('sim-s4-3');
      const bobInbox = await email('bob', 'Bob inbox');
      await api.call(`/api/me/connections/${bobInbox}/test`, { user: 'bob', method: 'POST' });

      const log = await getJson<AdminDeliveryView[]>('/api/admin/deliveries');

      expect(log.map((d) => [d.userName, d.kind, d.alertName, d.connectionLabel])).toEqual([
        ['Bob', 'test', undefined, 'Bob inbox'],
        ['Alice', 'alert', 'Quakes', 'Inbox'],
      ]);
      expect(log[1]?.event?.title).toBe('Quake');
    });

    // S4-6
    it('sends nothing to a disabled channel type and hides it from /channels', async () => {
      await createAlert('alice', 'Quakes', 'usgs', [
        await email('alice', 'Inbox'),
        await slack('alice', 'Team'),
      ]);

      const res = await patch('/api/admin/channels/slack', { enabled: false });
      expect(res.status).toBe(200);
      expect((await res.json()) as ChannelTypeSummary).toEqual({
        type: 'slack',
        label: 'Slack',
        enabled: false,
      });

      const sim = (await (await simulate('sim-s4-6')).json()) as SimulateEventResult;
      expect(sim.deliveries.map((d) => d.connectionLabel)).toEqual(['Inbox']);

      const channels = await getJson<ChannelDescriptor[]>('/api/channels', 'alice');
      expect(channels.map((c) => c.type)).toEqual(['email']);
      expect(await getJson<ChannelTypeSummary[]>('/api/admin/channels')).toEqual([
        { type: 'email', label: 'Email', enabled: true },
        { type: 'slack', label: 'Slack', enabled: false },
      ]);
    });

    it('a channel PATCH is 404 for an unknown type and 400 for a bad body', async () => {
      expect((await patch('/api/admin/channels/teams', { enabled: false })).status).toBe(404);
      expect((await patch('/api/admin/channels/slack', {})).status).toBe(400);
      expect((await patch('/api/admin/channels/slack', { enabled: 'no' })).status).toBe(400);
    });
  });

  describe('with fake sources', () => {
    const failingSource: Source = {
      id: 'down',
      label: 'Down feed',
      fetchRaw: () => Promise.reject(new Error('feed down')),
      normalise: () => [],
    };

    beforeEach(() => {
      api = startTestApp([offlineSource, failingSource]);
    });

    const health = async (id: string) =>
      (await getJson<SourceHealth[]>('/api/admin/sources')).find((s) => s.id === id);

    const pollNow = async (id: string) =>
      (
        (await (
          await api.call(`/api/admin/sources/${id}/poll`, { user: 'admin', method: 'POST' })
        ).json()) as PollResult
      ).status;

    // S4-4
    it('shows the last poll and error per source', async () => {
      await pollNow('down');

      const down = await health('down');
      expect(down).toMatchObject({ label: 'Down feed', enabled: true, lastError: 'feed down' });
      expect(down?.lastPollAt).toEqual(expect.any(String));
      const never = await health('fake');
      expect(never?.enabledAt).toEqual(expect.any(String));
      expect(never?.lastPollAt).toBeUndefined();
      expect(never?.lastError).toBeUndefined();
    });

    // S4-5 (D7, decisions.md S4-3)
    it('skips polls when disabled and moves the baseline only on off → on', async () => {
      const OLD = '2026-01-01T00:00:00.000Z';
      api.db.prepare("UPDATE sources SET enabled_at = ? WHERE id = 'fake'").run(OLD);
      const enable = async (enabled: boolean) => {
        const res = await patch('/api/admin/sources/fake', { enabled });
        expect(res.status).toBe(200);
        return (await res.json()) as SourceHealth;
      };

      expect((await enable(false)).enabled).toBe(false);
      expect(await pollNow('fake')).toBe('skipped');

      const on = await enable(true);
      expect(on.enabled).toBe(true);
      expect(on.enabledAt > OLD).toBe(true);

      // A fixed value, so a reset to now() can't pass by landing in the same millisecond.
      const KEPT = '2026-02-01T00:00:00.000Z';
      api.db.prepare("UPDATE sources SET enabled_at = ? WHERE id = 'fake'").run(KEPT);
      expect((await enable(true)).enabledAt).toBe(KEPT);
    });

    it('a source PATCH is 404 for an unknown id and 400 for a bad body', async () => {
      expect((await patch('/api/admin/sources/nope', { enabled: false })).status).toBe(404);
      expect((await patch('/api/admin/sources/fake', {})).status).toBe(400);
      expect((await patch('/api/admin/sources/fake', { enabled: 1 })).status).toBe(400);
    });
  });
});
