import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PollResult } from '@alerts/shared';
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
});
