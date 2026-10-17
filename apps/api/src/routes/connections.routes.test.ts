import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  ApiError,
  ChannelConnection,
  ChannelDescriptor,
  ConnectionInput,
  SendResult,
} from '@alerts/shared';
import { startTestApp, type TestServer } from '../test-support.ts';

const EMAIL: ConnectionInput = {
  type: 'email',
  label: 'Work inbox',
  config: { to: 'alice@example.com' },
};

describe('channels and connections API', () => {
  let api: TestServer;

  beforeEach(() => {
    api = startTestApp();
  });

  afterEach(() => {
    api.close();
  });

  async function create(user: string, input: ConnectionInput): Promise<ChannelConnection> {
    const res = await api.call('/api/me/connections', { user, method: 'POST', body: input });
    expect(res.status).toBe(201);
    return (await res.json()) as ChannelConnection;
  }

  it('GET /channels describes the registered channels (A12)', async () => {
    const res = await api.call('/api/channels', { user: 'alice' });
    const body = (await res.json()) as ChannelDescriptor[];

    expect(body.map((c) => c.type)).toEqual(['email', 'slack']);
    expect(body[0]?.fields[0]).toEqual({
      key: 'to',
      label: 'Email address',
      type: 'email',
      required: true,
    });
  });

  it('returns 401 without a user (S1-5)', async () => {
    expect((await api.call('/api/me/connections')).status).toBe(401);
  });

  it('creates and lists connections per user', async () => {
    const created = await create('alice', EMAIL);
    const list = (await (
      await api.call('/api/me/connections', { user: 'alice' })
    ).json()) as ChannelConnection[];

    expect(list).toEqual([created]);
    expect(await (await api.call('/api/me/connections', { user: 'bob' })).json()).toEqual([]);
  });

  it('returns 400 with field errors for an invalid email (S1-3)', async () => {
    const res = await api.call('/api/me/connections', {
      user: 'alice',
      method: 'POST',
      body: { type: 'email', label: '', config: { to: 'nope' } },
    });
    const body = (await res.json()) as ApiError;

    expect(res.status).toBe(400);
    expect(Object.keys(body.fieldErrors ?? {}).sort()).toEqual(['label', 'to']);
  });

  it('returns 400 for an unknown channel type', async () => {
    const res = await api.call('/api/me/connections', {
      user: 'alice',
      method: 'POST',
      body: { ...EMAIL, type: 'carrier-pigeon' },
    });
    expect(res.status).toBe(400);
  });

  it("hides another user's connection behind 404 (S1-6)", async () => {
    const { id } = await create('alice', EMAIL);
    const path = `/api/me/connections/${id}`;

    expect((await api.call(path, { user: 'bob', method: 'PUT', body: EMAIL })).status).toBe(404);
    expect((await api.call(path, { user: 'bob', method: 'DELETE' })).status).toBe(404);
    expect((await api.call(`${path}/test`, { user: 'bob', method: 'POST' })).status).toBe(404);
    expect((await api.call(path, { user: 'alice', method: 'DELETE' })).status).toBe(204);
  });

  it('updates label and config but never the type (S1-7, DS12)', async () => {
    const { id } = await create('alice', EMAIL);
    const path = `/api/me/connections/${id}`;

    const changed = await api.call(path, {
      user: 'alice',
      method: 'PUT',
      body: { ...EMAIL, label: 'Home', config: { to: 'home@example.com' } },
    });
    expect(((await changed.json()) as ChannelConnection).label).toBe('Home');

    const typeChange = await api.call(path, {
      user: 'alice',
      method: 'PUT',
      body: { type: 'slack', label: 'Home', config: {} },
    });
    expect(typeChange.status).toBe(400);
  });

  it('sends a test email, logs a test delivery and serves the preview (S1-1, S1-8)', async () => {
    const { id } = await create('alice', EMAIL);

    const res = await api.call(`/api/me/connections/${id}/test`, { user: 'alice', method: 'POST' });
    const result = (await res.json()) as SendResult;

    expect(result.status).toBe('sent');
    expect(result.previewUrl).toMatch(/^\/api\/previews\/[0-9a-f-]{36}$/);

    const rows = api.db.prepare('SELECT * FROM deliveries').all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'test',
      user_id: 'alice',
      connection_id: id,
      alert_id: null,
      event_id: null,
      status: 'sent',
    });

    const preview = await api.call(result.previewUrl ?? '');
    expect(preview.status).toBe(200);
    expect(await preview.text()).toContain('Test notification from World Alerts');
  });

  it('reports a Slack connection without a URL as a dry run (S1-2)', async () => {
    const { id } = await create('alice', { type: 'slack', label: 'Team', config: {} });

    const res = await api.call(`/api/me/connections/${id}/test`, { user: 'alice', method: 'POST' });

    expect(await res.json()).toEqual({ status: 'dry-run' });
  });

  it('respects the admin channel switch for Send test but keeps the connection editable (S1-15)', async () => {
    const { id } = await create('alice', EMAIL);
    api.db.prepare("UPDATE channel_types SET enabled = 0 WHERE type = 'email'").run();

    const test = await api.call(`/api/me/connections/${id}/test`, {
      user: 'alice',
      method: 'POST',
    });
    expect(await test.json()).toEqual({ status: 'failed', error: 'Channel disabled by admin.' });
    expect(api.db.prepare('SELECT * FROM deliveries').all()).toHaveLength(0);

    const edit = await api.call(`/api/me/connections/${id}`, {
      user: 'alice',
      method: 'PUT',
      body: { ...EMAIL, label: 'Renamed' },
    });
    expect(edit.status).toBe(200);

    const add = await api.call('/api/me/connections', {
      user: 'alice',
      method: 'POST',
      body: EMAIL,
    });
    expect(add.status).toBe(400);
  });
});
