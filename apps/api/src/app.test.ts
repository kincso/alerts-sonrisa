import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { HealthResponse, UserSummary } from '@alerts/shared';
import { startTestApp, type TestServer } from './test-support.ts';

describe('public endpoints', () => {
  let api: TestServer;

  beforeAll(() => {
    api = startTestApp();
  });

  afterAll(() => {
    api.close();
  });

  it('GET /api/health returns ok and the shared severity order', async () => {
    const res = await api.call('/api/health');
    const body = (await res.json()) as HealthResponse;

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'ok', severities: ['low', 'medium', 'high'] });
  });

  it('GET /api/users lists the seeded users without a header (DS6)', async () => {
    const res = await api.call('/api/users');
    const body = (await res.json()) as UserSummary[];

    expect(res.status).toBe(200);
    expect(body.map((u) => u.id)).toEqual(['alice', 'bob', 'admin']);
    expect(Object.keys(body[0] ?? {}).sort()).toEqual(['id', 'name', 'role']);
  });

  it('GET /api/previews/:id returns 404 for an unknown preview', async () => {
    const res = await api.call('/api/previews/does-not-exist');
    expect(res.status).toBe(404);
  });
});
