import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  Alert,
  AlertInput,
  ApiError,
  ChannelConnection,
  DeliveryView,
  SourceSummary,
} from '@alerts/shared';
import { startTestApp, type TestServer } from '../test-support.ts';

describe('alerts, sources and deliveries API', () => {
  let api: TestServer;
  let aliceEmail: ChannelConnection;
  let bobEmail: ChannelConnection;

  async function connect(user: string): Promise<ChannelConnection> {
    const res = await api.call('/api/me/connections', {
      user,
      method: 'POST',
      body: { type: 'email', label: `${user} inbox`, config: { to: `${user}@example.com` } },
    });
    return (await res.json()) as ChannelConnection;
  }

  const input = (over: Partial<AlertInput> = {}): AlertInput => ({
    name: 'Big quakes',
    sourceId: 'usgs',
    keywords: [' Peru ', 'peru', ''],
    minSeverity: 'medium',
    connectionIds: [aliceEmail.id],
    ...over,
  });

  async function create(over: Partial<AlertInput> = {}): Promise<Alert> {
    const res = await api.call('/api/me/alerts', {
      user: 'alice',
      method: 'POST',
      body: input(over),
    });
    expect(res.status).toBe(201);
    return (await res.json()) as Alert;
  }

  async function fieldErrorsFor(body: unknown): Promise<string[]> {
    const res = await api.call('/api/me/alerts', { user: 'alice', method: 'POST', body });
    expect(res.status).toBe(400);
    return Object.keys(((await res.json()) as ApiError).fieldErrors ?? {}).sort();
  }

  beforeEach(async () => {
    api = startTestApp();
    aliceEmail = await connect('alice');
    bobEmail = await connect('bob');
  });

  afterEach(() => {
    api.close();
  });

  it('GET /sources lists every source with the BBC fixed severity (S3-3)', async () => {
    api.db.prepare("UPDATE sources SET enabled = 0 WHERE id = 'bbc'").run();
    const body = (await (
      await api.call('/api/sources', { user: 'alice' })
    ).json()) as SourceSummary[];

    expect(body).toEqual([
      { id: 'bbc', label: 'BBC World News', enabled: false, fixedSeverity: 'medium' },
      { id: 'usgs', label: 'USGS earthquakes', enabled: true },
    ]);
  });

  // testing.md S3-10
  it('creates an active alert with cleaned-up keywords and lists it per user', async () => {
    const alert = await create();

    expect(alert).toMatchObject({
      name: 'Big quakes',
      sourceId: 'usgs',
      keywords: ['Peru'],
      minSeverity: 'medium',
      active: true,
      connectionIds: [aliceEmail.id],
    });
    expect(alert).not.toHaveProperty('userId');
    expect(await (await api.call('/api/me/alerts', { user: 'alice' })).json()).toEqual([alert]);
    expect(await (await api.call('/api/me/alerts', { user: 'bob' })).json()).toEqual([]);
  });

  it('updates, pauses and deletes an alert', async () => {
    const { id } = await create();
    const path = `/api/me/alerts/${id}`;

    const put = await api.call(path, {
      user: 'alice',
      method: 'PUT',
      body: input({ name: 'All quakes', keywords: [], minSeverity: 'low' }),
    });
    expect(await put.json()).toMatchObject({
      name: 'All quakes',
      keywords: [],
      minSeverity: 'low',
    });

    const patch = await api.call(path, { user: 'alice', method: 'PATCH', body: { active: false } });
    expect(((await patch.json()) as Alert).active).toBe(false);
    const badPatch = await api.call(path, { user: 'alice', method: 'PATCH', body: {} });
    expect(badPatch.status).toBe(400);

    expect((await api.call(path, { user: 'alice', method: 'DELETE' })).status).toBe(204);
    expect(await (await api.call('/api/me/alerts', { user: 'alice' })).json()).toEqual([]);
  });

  it("hides another user's alert behind 404", async () => {
    const { id } = await create();
    const path = `/api/me/alerts/${id}`;

    expect((await api.call(path, { user: 'bob', method: 'PUT', body: input() })).status).toBe(404);
    expect(
      (await api.call(path, { user: 'bob', method: 'PATCH', body: { active: false } })).status,
    ).toBe(404);
    expect((await api.call(path, { user: 'bob', method: 'DELETE' })).status).toBe(404);
  });

  it('returns 400 field errors for missing or invalid fields', async () => {
    expect(await fieldErrorsFor({})).toEqual(['connectionIds', 'minSeverity', 'name', 'sourceId']);
    expect(await fieldErrorsFor(input({ sourceId: 'nasa' }))).toEqual(['sourceId']);
    expect(await fieldErrorsFor({ ...input(), minSeverity: 'extreme' })).toEqual(['minSeverity']);
    expect(await fieldErrorsFor(input({ connectionIds: [] }))).toEqual(['connectionIds']);
  });

  // testing.md S3-22 (S3 review m1): a wrong type must not widen the alert to every event.
  it('returns 400 when keywords is present but not a list of strings', async () => {
    expect(await fieldErrorsFor({ ...input(), keywords: 'Peru' })).toEqual(['keywords']);
    expect(await fieldErrorsFor({ ...input(), keywords: ['Peru', 5] })).toEqual(['keywords']);
    expect(await fieldErrorsFor({ ...input(), keywords: null })).toEqual(['keywords']);

    const withoutKeywords: Partial<AlertInput> = input();
    delete withoutKeywords.keywords;
    const res = await api.call('/api/me/alerts', {
      user: 'alice',
      method: 'POST',
      body: withoutKeywords,
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as Alert).keywords).toEqual([]);
  });

  it("rejects another user's or an unknown connection with the same message (DS12)", async () => {
    const res = await api.call('/api/me/alerts', {
      user: 'alice',
      method: 'POST',
      body: input({ connectionIds: [bobEmail.id] }),
    });
    const unknown = await api.call('/api/me/alerts', {
      user: 'alice',
      method: 'POST',
      body: input({ connectionIds: ['no-such-id'] }),
    });

    const message = ((await res.json()) as ApiError).fieldErrors?.['connectionIds'];
    expect(message).toBeDefined();
    expect(((await unknown.json()) as ApiError).fieldErrors?.['connectionIds']).toBe(message);
  });

  // testing.md S3-11
  it('blocks deleting a connection an alert uses, until it is unlinked (D6)', async () => {
    const alert = await create();
    const path = `/api/me/connections/${aliceEmail.id}`;

    const blocked = await api.call(path, { user: 'alice', method: 'DELETE' });
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toEqual({
      message: '"alice inbox" is used by: Big quakes.',
      alerts: [{ id: alert.id, name: 'Big quakes' }],
    });

    const slack = await api.call('/api/me/connections', {
      user: 'alice',
      method: 'POST',
      body: { type: 'slack', label: 'Team', config: {} },
    });
    const slackId = ((await slack.json()) as ChannelConnection).id;
    await api.call(`/api/me/alerts/${alert.id}`, {
      user: 'alice',
      method: 'PUT',
      body: input({ connectionIds: [slackId] }),
    });

    expect((await api.call(path, { user: 'alice', method: 'DELETE' })).status).toBe(204);
  });

  // testing.md S3-13
  it("GET /me/deliveries returns only the caller's rows, newest first, tests included", async () => {
    await create();
    await api.call(`/api/me/connections/${aliceEmail.id}/test`, { user: 'alice', method: 'POST' });
    await api.call(`/api/me/connections/${bobEmail.id}/test`, { user: 'bob', method: 'POST' });
    await api.call('/api/admin/simulate-event', {
      user: 'admin',
      method: 'POST',
      body: { sourceId: 'usgs', title: 'M 5.5 - near Lima, Peru', severity: 'medium' },
    });

    const res = await api.call('/api/me/deliveries', { user: 'alice' });
    const body = (await res.json()) as DeliveryView[];

    expect(body.map((d) => [d.kind, d.alertName, d.event?.title])).toEqual([
      ['alert', 'Big quakes', 'M 5.5 - near Lima, Peru'],
      ['test', undefined, undefined],
    ]);
    expect(body[0]?.previewUrl).toMatch(/^\/api\/previews\//);
  });
});
