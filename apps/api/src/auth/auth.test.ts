import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openDatabase } from '../db/database.ts';
import { seed } from '../db/seed.ts';
import { startServer, type TestServer } from '../test-support.ts';
import { authenticate, currentUser } from './auth.middleware.ts';
import { requireAdmin } from './require-admin.ts';

// testing.md S1-5, plus requireAdmin (used by admin routes from S2 on).
describe('authenticate + requireAdmin', () => {
  let api: TestServer;

  beforeAll(() => {
    const db = openDatabase(':memory:');
    seed(db, [], []);
    const app = express();
    app.use(authenticate(db));
    app.get('/whoami', (req, res) => {
      res.json({ id: currentUser(req).id });
    });
    app.get('/admin-only', requireAdmin, (_req, res) => {
      res.json({ ok: true });
    });
    api = startServer(app, db);
  });

  afterAll(() => {
    api.close();
  });

  it('returns 401 without an X-User-Id header', async () => {
    expect((await api.call('/whoami')).status).toBe(401);
  });

  it('returns 401 for an unknown user', async () => {
    expect((await api.call('/whoami', { user: 'mallory' })).status).toBe(401);
  });

  it('resolves a known user', async () => {
    const res = await api.call('/whoami', { user: 'alice' });
    expect(await res.json()).toEqual({ id: 'alice' });
  });

  it('returns 403 on admin routes for a normal user and 200 for the admin', async () => {
    expect((await api.call('/admin-only', { user: 'alice' })).status).toBe(403);
    expect((await api.call('/admin-only', { user: 'admin' })).status).toBe(200);
  });
});
